import { z } from "zod"

import { db } from "~/shared/db/client"
import { ApiError } from "~/shared/http/errors"
import { log } from "~/shared/log/logger"

import {
  cleanSeedArchiveSource,
  expireSeedArchiveReceipts,
  failSeedArchive,
} from "./admin-seed.archives.service"
import { processSeedInstall } from "./admin-seed.install.service"
import { cleanUpSeedImages } from "./admin-seed.media-cleanup.service"
import { processSeedMedia } from "./admin-seed.media.service"
import { processSeedRemoval } from "./admin-seed.removal.service"
import { processSeedArchiveValidation } from "./admin-seed.validation.service"
import * as q from "./admin-seed.work.queries"

const missingSourceSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
})

const RUN_BUDGET_MS = 45_000

/**
 * The minute job: repeats single passes until one handles nothing or the budget is spent, so a
 * 50-image ZIP finishes in one or two runs instead of waiting a minute after every 5 images.
 * Each pass still checkpoints on its own, and the budget leaves the next minute's run free to start.
 */
export async function runSeedPasses(budgetMs = RUN_BUDGET_MS): Promise<number> {
  const start = performance.now()
  let total = 0
  for (;;) {
    const handled = await runSeedPass()
    total += handled
    if (!handled || performance.now() - start >= budgetMs) return total
  }
}

/** Runs only implemented archive stages; unsupported kinds stay queued for their dispatcher. */
export async function runSeedPass(): Promise<number> {
  await expireSeedArchiveReceipts()
  await cleanUpSeedImages()
  await cleanArchiveSources()
  const operation = await q.getQueuedWork(db)
  if (!operation) return 0
  if (operation.kind === "seed") return processSeedInstall(operation.id)
  if (operation.kind === "remove") return processSeedRemoval(operation.id)
  if (operation.kind !== "archive") return 0
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
