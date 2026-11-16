import type {
  SeedArchiveInput,
  SeedOperation,
} from "@sayaratak/shared/schemas/admin-seed"

import { db } from "~/shared/db/client"
import { transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { seedArchives } from "~/shared/storage/seed-archives"
import { clock } from "~/shared/time/clock"
import { recordSystemAudit } from "~/modules/audit/audit.service"
import type { Actor } from "~/modules/audit/audit.types"

import * as q from "./admin-seed.archive.queries"
import { reserveSeedArchive } from "./admin-seed.archive-reservation.service"
import { streamSeedArchive } from "./admin-seed.archive-stream.service"
import { archiveCheckpointSchema } from "./admin-seed.archive.types"
import { toSeedOperation } from "./admin-seed.mapper"
import * as operations from "./admin-seed.operations.queries"
import * as storage from "./admin-seed.storage.queries"

const RECEIVING_TIMEOUT_MS = 120_000

/** Durably receives an admitted archive; replays never pull the supplied body. */
export async function receiveSeedArchive(
  actor: Actor,
  input: SeedArchiveInput,
  source: ReadableStream<Uint8Array>
): Promise<SeedOperation> {
  await expireSeedArchiveReceipts()
  const reservation = await reserveSeedArchive(actor, input)
  if (!reservation.receive) return toSeedOperation(reservation.operation)
  const operation = reservation.operation
  const checkpoint = archiveCheckpointSchema.parse(operation.checkpoint)
  try {
    await streamSeedArchive({
      key: checkpoint.archiveKey,
      metadata: input,
      source,
      reservedAt: operation.updatedAt,
    })
    return await queueReceivedArchive(operation.id)
  } catch {
    // A commit acknowledgment can be lost after the ZIP is already durably queued.
    const current = await q.getArchiveOperation(db, operation.id)
    if (current && current.stage !== "upload" && current.state !== "failed")
      return toSeedOperation(current)
    await failSeedArchive(operation.id, "seed_archive_upload_failed")
    await cleanSeedArchiveSource(operation.id, true)
    fail.validation({ archive: "validation.seed_archive_upload" })
  }
}

/** Marks abandoned receiving slots failed; explicit supersession admits a replacement body. */
export async function expireSeedArchiveReceipts() {
  const expired = await transaction(async (tx) => {
    const dataset = await q.lockArchiveDataset(tx)
    if (!dataset) return undefined
    const active = await operations.getActiveOperation(tx, dataset.id)
    if (active?.kind !== "archive" || active.state !== "receiving")
      return undefined
    if (
      clock.now().getTime() - active.updatedAt.getTime() <
      RECEIVING_TIMEOUT_MS
    )
      return undefined
    await q.updateArchiveOperation(tx, {
      id: active.id,
      changes: {
        state: "failed",
        errorCode: "seed_archive_receiving_timeout",
        updatedAt: clock.now(),
      },
    })
    await recordSystemAudit(tx, {
      action: "seed.archive.timeout",
      targetType: "seed",
      targetId: active.id,
      ip: active.actorIp,
      reason: "seed_archive_receiving_timeout",
    })
    return active.id
  })
  if (expired) await cleanSeedArchiveSource(expired)
  return expired ? 1 : 0
}

/** Records a safe failure without changing any accepted image generation. */
export async function failSeedArchive(operationId: string, code: string) {
  await transaction(async (tx) => {
    await q.lockArchiveDataset(tx)
    const operation = await q.lockArchiveOperation(tx, operationId)
    if (!operation || operation.supersededBy || operation.state === "completed")
      return
    await q.updateArchiveOperation(tx, {
      id: operation.id,
      changes: { state: "failed", errorCode: code, updatedAt: clock.now() },
    })
    await recordSystemAudit(tx, {
      action: "seed.archive.fail",
      targetType: "seed",
      targetId: operation.id,
      ip: operation.actorIp,
      reason: code,
      after: { actorId: operation.actorId, stage: operation.stage },
    })
  })
}

/** Deletes only the exact reserved archive object, keeping a durable intent on failure. */
export async function cleanSeedArchiveSource(
  operationId: string,
  force = false
) {
  const intents = await storage.listOperationStorageIntents(db, operationId)
  for (const intent of intents) {
    if (intent.provider !== "r2" || intent.purpose !== "archive") continue
    if (intent.state === "deleted" && !force) continue
    await storage.updateStorageIntent(db, {
      operationId,
      objectKey: intent.objectKey,
      state: "delete-pending",
    })
    await seedArchives.remove(intent.objectKey)
    await storage.updateStorageIntent(db, {
      operationId,
      objectKey: intent.objectKey,
      state: "deleted",
    })
  }
}

/** Retries exact R2 cleanup for failed intake even before an admin supersedes its slot. */
export async function cleanFailedSeedArchiveSources(): Promise<number> {
  const operations = await storage.listFailedArchiveCleanup(db)
  for (const operation of operations) await cleanSeedArchiveSource(operation.id)
  return operations.length
}

async function queueReceivedArchive(operationId: string) {
  return transaction(async (tx) => {
    await q.lockArchiveDataset(tx)
    const operation = await q.lockArchiveOperation(tx, operationId)
    if (operation?.state !== "receiving" || operation.supersededBy)
      fail.conflict()
    const checkpoint = archiveCheckpointSchema.parse(operation.checkpoint)
    await storage.updateStorageIntent(tx, {
      operationId,
      objectKey: checkpoint.archiveKey,
      state: "stored",
    })
    const queued = await q.updateArchiveOperation(tx, {
      id: operationId,
      changes: {
        state: "queued",
        stage: "validate",
        completed: 0,
        total: 0,
        updatedAt: clock.now(),
      },
    })
    if (!queued) fail.conflict()
    return toSeedOperation(queued)
  })
}
