import { recordSystemAudit } from "~/modules/audit/audit.service"
import { retryHostDeletes } from "~/modules/uploads/uploads.host.service"
import * as uploadsRemoval from "~/modules/uploads/uploads.seed-removal.service"
import { type Transaction, afterCommit } from "~/shared/db/tx"
import { clock } from "~/shared/time/clock"

import * as qInstall from "./admin-seed.install.queries"
import { resolveTransitiveProtection } from "./admin-seed.protection.service"
import * as qRem from "./admin-seed.removal.queries"

const MEDIA_PASS_SIZE = 5

async function completeRemoval(
  tx: Transaction,
  dataset: NonNullable<Awaited<ReturnType<typeof qInstall.lockInstallDataset>>>,
  op: NonNullable<Awaited<ReturnType<typeof qInstall.lockInstallOperation>>>
) {
  const now = clock.now()
  const finalState = op.retainedRecords > 0 ? "retained" : "removed"
  await qInstall.updateInstallOperation(tx, {
    id: op.id,
    set: {
      state: "completed",
      stage: "complete",
      activeSlot: null,
      completed: 230,
      updatedAt: now,
    },
  })
  await qRem.updateDatasetRemovalState(tx, {
    id: dataset.id,
    state: finalState,
    at: now,
  })
  await recordSystemAudit(tx, {
    action: "seed.removed",
    targetType: "seed",
    targetId: dataset.id,
    after: {
      operationId: op.id,
      retainedRecords: op.retainedRecords,
      finalState,
    },
  })
  return 0
}

async function removeUploadBatch(
  tx: Transaction,
  dataset: NonNullable<Awaited<ReturnType<typeof qInstall.lockInstallDataset>>>,
  scope: {
    records: Array<{ domain: string; recordId: string }>
    allUploads: Array<{ id: string }>
    remaining: Array<{ id: string }>
  }
) {
  const protection = await resolveTransitiveProtection(tx, {
    datasetId: dataset.id,
    listingIds: scope.records
      .filter((r) => r.domain === "listing")
      .map((r) => r.recordId),
    businessIds: scope.records
      .filter(
        (r) =>
          r.domain !== "listing" &&
          r.domain !== "owner" &&
          r.domain !== "upload"
      )
      .map((r) => r.recordId),
    ownerIds: scope.records
      .filter((r) => r.domain === "owner")
      .map((r) => r.recordId),
    uploadIds: scope.allUploads.map((u) => u.id),
  })
  const slice = scope.remaining.slice(0, MEDIA_PASS_SIZE).map((r) => r.id)
  const result = await uploadsRemoval.removeSeedRecords(tx, {
    datasetId: dataset.id,
    manifestDigest: "",
    orderedOwnedIds: slice,
    orderedProtectedIds: Array.from(protection.protectedUploads),
  })
  for (const id of result.deletedIds)
    await qRem.updateRecordOutcome(tx, {
      datasetId: dataset.id,
      domain: "upload",
      recordId: id,
      outcome: "removed",
    })
  for (const r of result.retained)
    await qRem.updateRecordOutcome(tx, {
      datasetId: dataset.id,
      domain: "upload",
      recordId: r.id,
      outcome: "retained",
      reason: r.reason,
    })
  afterCommit(tx, async () => {
    await retryHostDeletes(MEDIA_PASS_SIZE)
  })
  return slice.length
}

async function checkOutboxCleanup(
  tx: Transaction,
  dataset: NonNullable<Awaited<ReturnType<typeof qInstall.lockInstallDataset>>>,
  op: NonNullable<Awaited<ReturnType<typeof qInstall.lockInstallOperation>>>
) {
  await retryHostDeletes(MEDIA_PASS_SIZE)
  const cleanup = await uploadsRemoval.getSeedMediaCleanup(tx, dataset.id)
  if (cleanup.failed > 0) {
    await qInstall.updateInstallOperation(tx, {
      id: op.id,
      set: {
        state: "failed",
        errorCode: "seed_media_cleanup_failed",
        updatedAt: clock.now(),
      },
    })
    return 0
  }
  if (cleanup.pending > 0) return 1
  return completeRemoval(tx, dataset, op)
}

export async function processMediaPass(
  tx: Transaction,
  dataset: NonNullable<Awaited<ReturnType<typeof qInstall.lockInstallDataset>>>,
  op: NonNullable<Awaited<ReturnType<typeof qInstall.lockInstallOperation>>>
): Promise<number> {
  const records = await qRem.listOwnedRecordsByDataset(tx, dataset.id)
  const alreadyRetained = new Set(
    records
      .filter((r) => r.domain === "upload" && r.outcome === "retained")
      .map((r) => r.recordId)
  )
  const allUploads = await uploadsRemoval.listDatasetUploads(tx, dataset.id)
  const remaining = allUploads.filter((u) => !alreadyRetained.has(u.id))
  if (remaining.length > 0) {
    return removeUploadBatch(tx, dataset, { records, allUploads, remaining })
  }
  return checkOutboxCleanup(tx, dataset, op)
}
