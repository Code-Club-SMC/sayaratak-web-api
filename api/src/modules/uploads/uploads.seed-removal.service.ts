import { env } from "~/env"
import type {
  SeedCleanupStatus,
  SeedRemovalResult,
  SeedRemovalScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Executor, Transaction } from "~/shared/db/tx"

import { queueSeedImageDeletion } from "./uploads.seed-cleanup.service"
import * as q from "./uploads.seed-removal.queries"

export async function getSeedMediaCleanup(
  ex: Executor,
  datasetId: string
): Promise<SeedCleanupStatus> {
  const keyPrefix = `sayaratak/${env.APP_ENV}/seed/${datasetId}/`
  const outbox = await q.countDatasetDeletions(ex, keyPrefix)
  return {
    pending: outbox.pending,
    failed: outbox.failed,
    deleted: 0,
    error: outbox.failed > 0 ? "seed_media_cleanup_failed" : null,
  }
}

export function listDatasetUploads(ex: Executor, datasetId: string) {
  return q.listDatasetUploads(ex, datasetId)
}

async function queueUploadDeletionIfUnshared(
  tx: Transaction,
  row: { id: string; cloudinaryId: string | null; mime: string | null },
  datasetId: string
) {
  if (!row.cloudinaryId) return
  const otherCount = await q.countCloudinaryIdReferences(
    tx,
    row.cloudinaryId,
    row.id
  )
  if (otherCount === 0) {
    await queueSeedImageDeletion(tx, {
      datasetId,
      immutableKey: row.cloudinaryId,
      mime: row.mime ?? "image/jpeg",
      allowAttached: true,
    })
  }
}

export async function removeSeedRecords(
  tx: Transaction,
  scope: SeedRemovalScope
): Promise<SeedRemovalResult> {
  const protectedSet = new Set(scope.orderedProtectedIds)
  const rows = await q.findOwnedSeedUploads(tx, {
    datasetId: scope.datasetId,
    ids: scope.orderedOwnedIds,
  })
  const rowMap = new Map(rows.map((r) => [r.id, r]))

  const toDelete: string[] = []
  const alreadyMissingIds: string[] = []
  const retained: Array<{ id: string; reason: string }> = []

  for (const id of scope.orderedOwnedIds) {
    const row = rowMap.get(id)
    if (!row) {
      alreadyMissingIds.push(id)
    } else if (protectedSet.has(id)) {
      retained.push({ id, reason: "has_real_references" })
    } else {
      await queueUploadDeletionIfUnshared(tx, row, scope.datasetId)
      toDelete.push(id)
    }
  }

  await q.deleteUploadRows(tx, toDelete)
  return {
    domain: "upload",
    deletedIds: toDelete,
    alreadyMissingIds,
    retained,
  }
}
