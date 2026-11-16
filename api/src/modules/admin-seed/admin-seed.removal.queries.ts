import { and, asc, eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import {
  seedAssets,
  seedRecords,
  seedStorageIntents,
} from "./admin-seed.assets.tables"
import { seedDatasets, seedOperations } from "./admin-seed.tables"

export async function listOwnedRecordsByDataset(
  ex: Executor,
  datasetId: string
) {
  return ex
    .select({
      domain: seedRecords.domain,
      recordId: seedRecords.recordId,
      recordDigest: seedRecords.recordDigest,
      outcome: seedRecords.outcome,
      retentionReason: seedRecords.retentionReason,
    })
    .from(seedRecords)
    .where(eq(seedRecords.datasetId, datasetId))
    .orderBy(asc(seedRecords.recordId))
}

export async function updateRecordOutcome(
  ex: Executor,
  input: {
    datasetId: string
    domain: typeof seedRecords.$inferInsert.domain
    recordId: string
    outcome: "removed" | "retained"
    reason?: string
  }
) {
  return ex
    .update(seedRecords)
    .set({
      outcome: input.outcome,
      retentionReason: input.reason ?? null,
    })
    .where(
      and(
        eq(seedRecords.datasetId, input.datasetId),
        eq(seedRecords.domain, input.domain),
        eq(seedRecords.recordId, input.recordId)
      )
    )
}

export async function listAcceptedUploadIds(ex: Executor, datasetId: string) {
  const rows = await ex
    .select({ uploadId: seedAssets.uploadId })
    .from(seedAssets)
    .where(
      and(eq(seedAssets.datasetId, datasetId), eq(seedAssets.accepted, true))
    )
  return rows.map((r) => r.uploadId).filter((id): id is string => Boolean(id))
}

export async function listStorageIntentsForDataset(
  ex: Executor,
  datasetId: string
) {
  return ex
    .select()
    .from(seedStorageIntents)
    .where(eq(seedStorageIntents.datasetId, datasetId))
}

export async function supersedeActiveOperations(
  ex: Executor,
  input: { datasetId: string; supersededBy: string; at: Date }
) {
  return ex
    .update(seedOperations)
    .set({
      activeSlot: null,
      supersededBy: input.supersededBy,
      updatedAt: input.at,
    })
    .where(
      and(
        eq(seedOperations.datasetId, input.datasetId),
        eq(seedOperations.activeSlot, true)
      )
    )
}

export function updateDatasetRemovalState(
  ex: Executor,
  change: {
    id: string
    state: "removed" | "retained"
    at: Date
  }
) {
  return ex
    .update(seedDatasets)
    .set({
      state: change.state,
      liveSlot: change.state === "removed" ? null : true,
      updatedAt: change.at,
    })
    .where(eq(seedDatasets.id, change.id))
}
