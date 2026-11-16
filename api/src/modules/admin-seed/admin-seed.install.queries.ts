import { and, asc, eq, inArray } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { seedAssets, seedRecords } from "./admin-seed.assets.tables"
import { seedDatasets, seedOperations } from "./admin-seed.tables"

export function lockInstallDataset(ex: Executor, id: string) {
  // Global lock order: dataset, operation, sorted owners, records, uploads.
  return ex
    .select()
    .from(seedDatasets)
    .where(eq(seedDatasets.id, id))
    .for("update")
    .then(([row]) => row)
}

export function getInstallOperation(ex: Executor, id: string) {
  return ex
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, id))
    .then(([row]) => row)
}

export function lockInstallOperation(ex: Executor, id: string) {
  // Always called after locking this operation's dataset.
  return ex
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, id))
    .for("update")
    .then(([row]) => row)
}

export function listAcceptedAssets(ex: Executor, datasetId: string) {
  return ex
    .select()
    .from(seedAssets)
    .where(
      and(eq(seedAssets.datasetId, datasetId), eq(seedAssets.accepted, true))
    )
    .orderBy(asc(seedAssets.assetId))
}

export function listInstallAssets(
  ex: Executor,
  input: { datasetId: string; assetIds: string[] }
) {
  if (!input.assetIds.length) return Promise.resolve([])
  return ex
    .select()
    .from(seedAssets)
    .where(
      and(
        eq(seedAssets.datasetId, input.datasetId),
        eq(seedAssets.accepted, true),
        inArray(seedAssets.assetId, input.assetIds)
      )
    )
}

export function insertInstallOperation(
  ex: Executor,
  row: typeof seedOperations.$inferInsert
) {
  return ex
    .insert(seedOperations)
    .values(row)
    .returning()
    .then(([inserted]) => inserted)
}

export function updateInstallOperation(
  ex: Executor,
  change: {
    id: string
    set: Partial<typeof seedOperations.$inferInsert>
  }
) {
  return ex
    .update(seedOperations)
    .set(change.set)
    .where(eq(seedOperations.id, change.id))
}

export function updateInstallDataset(
  ex: Executor,
  change: {
    id: string
    state: typeof seedDatasets.$inferInsert.state
    at: Date
  }
) {
  return ex
    .update(seedDatasets)
    .set({ state: change.state, updatedAt: change.at })
    .where(eq(seedDatasets.id, change.id))
}

export function getInstallRecord(
  ex: Executor,
  ref: {
    datasetId: string
    domain: typeof seedRecords.$inferInsert.domain
    recordId: string
  }
) {
  return ex
    .select()
    .from(seedRecords)
    .where(
      and(
        eq(seedRecords.datasetId, ref.datasetId),
        eq(seedRecords.domain, ref.domain),
        eq(seedRecords.recordId, ref.recordId)
      )
    )
    .then(([row]) => row)
}

export function insertInstallRecord(
  ex: Executor,
  row: typeof seedRecords.$inferInsert
) {
  return ex.insert(seedRecords).values(row)
}
