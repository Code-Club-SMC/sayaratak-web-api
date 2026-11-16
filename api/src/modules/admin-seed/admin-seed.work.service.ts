import { z } from "zod"

import { db } from "~/shared/db/client"
import { ApiError } from "~/shared/http/errors"
import { log } from "~/shared/log/logger"

import {
  cleanSeedArchiveSource,
  expireSeedArchiveReceipts,
  failSeedArchive,
} from "./admin-seed.archives.service"
import { cleanUpSeedImages } from "./admin-seed.media-cleanup.service"
import { processSeedMedia } from "./admin-seed.media.service"
import { processSeedArchiveValidation } from "./admin-seed.validation.service"
import * as q from "./admin-seed.work.queries"

const missingSourceSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
})

/** Runs only implemented archive stages; unsupported kinds stay queued for their dispatcher. */
export async function runSeedPass(): Promise<number> {
  await expireSeedArchiveReceipts()
  await cleanUpSeedImages()
  await cleanArchiveSources()
  const operation = await q.getQueuedWork(db)
  if (operation?.kind !== "archive") return 0
  try {
    if (operation.stage === "validate")
      return await processSeedArchiveValidation(operation.id)
    if (operation.stage === "store-images")
      return await processSeedMedia(operation.id)
    // No stage may fall through to a successful completion.
    await failSeedArchive(operation.id, "seed_stage_unsupported")
    return 0
  } catch (error) {
    // A worker failure is durable and sanitized; the checkpoint remains retryable.
    await failSeedArchive(operation.id, seedMediaFailureCode(error))
    return 0
  }
}

/** Classifies confirmed source absence separately from transient provider failures. */
export function seedMediaFailureCode(error: unknown) {
  if (
    error instanceof ApiError &&
    error.fields?.archive === "validation.seed_archive_source_expired"
  )
    return "seed_archive_source_expired"
  const parsed = missingSourceSchema.safeParse(error)
  if (
    parsed.success &&
    (parsed.data.message === "seed_archive_missing" ||
      parsed.data.code === "NoSuchKey" ||
      parsed.data.code === "NotFound")
  )
    return "seed_archive_source_expired"
  if (error instanceof ApiError) return "seed_media_conflict"
  return "seed_media_storage_failed"
}

async function cleanArchiveSources() {
  const operations = await q.listArchiveCleanupOperations(db)
  for (const operation of operations) {
    try {
      await cleanSeedArchiveSource(operation.id)
    } catch (error) {
      // The reserved source intent remains delete-pending, without blocking newer image work.
      log.error("seed_archive_cleanup_failed", {
        operationId: operation.id,
        error,
      })
    }
  }
}
