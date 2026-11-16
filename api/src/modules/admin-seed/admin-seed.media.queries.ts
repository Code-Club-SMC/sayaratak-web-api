import { and, count, eq, inArray } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import {
  seedAssets,
  seedRecords,
  seedStorageIntents,
} from "./admin-seed.assets.tables"

export function listOperationImages(ex: Executor, operationId: string) {
  return ex
    .select()
    .from(seedAssets)
    .where(eq(seedAssets.operationId, operationId))
    .orderBy(seedAssets.assetId)
}

export function listMediaImages(
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
        inArray(seedAssets.assetId, input.assetIds)
      )
    )
}

export function insertValidatedImage(
  ex: Executor,
  row: typeof seedAssets.$inferInsert
) {
  return ex.insert(seedAssets).values(row).onConflictDoNothing()
}

export function insertImageIntent(
  ex: Executor,
  row: typeof seedStorageIntents.$inferInsert
) {
  return ex.insert(seedStorageIntents).values(row).onConflictDoNothing()
}

export async function getImageIntent(ex: Executor, objectKey: string) {
  const [row] = await ex
    .select()
    .from(seedStorageIntents)
    .where(
      and(
        eq(seedStorageIntents.provider, "cloudinary"),
        eq(seedStorageIntents.objectKey, objectKey)
      )
    )
  return row
}

export function updateStoredImage(
  ex: Executor,
  input: {
    datasetId: string
    assetId: string
    generation: number
    uploadId: string
    providerId: string
  }
) {
  return ex
    .update(seedAssets)
    .set({
      state: "stored",
      uploadId: input.uploadId,
      providerId: input.providerId,
    })
    .where(
      and(
        eq(seedAssets.datasetId, input.datasetId),
        eq(seedAssets.assetId, input.assetId),
        eq(seedAssets.generation, input.generation)
      )
    )
}

export function updateIntentState(
  ex: Executor,
  input: { objectKey: string; state: "stored" | "delete-pending" | "deleted" }
) {
  return ex
    .update(seedStorageIntents)
    .set({ state: input.state })
    .where(
      and(
        eq(seedStorageIntents.provider, "cloudinary"),
        eq(seedStorageIntents.objectKey, input.objectKey)
      )
    )
}

export function listAcceptedImages(
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

export function updateImagesAccepted(
  ex: Executor,
  input: { datasetId: string; assetId: string; generation: number }
) {
  return ex
    .update(seedAssets)
    .set({ accepted: true })
    .where(
      and(
        eq(seedAssets.datasetId, input.datasetId),
        eq(seedAssets.assetId, input.assetId),
        eq(seedAssets.generation, input.generation)
      )
    )
}

export function updateImagesUnaccepted(
  ex: Executor,
  input: { datasetId: string; assetIds: string[] }
) {
  return ex
    .update(seedAssets)
    .set({ accepted: false })
    .where(
      and(
        eq(seedAssets.datasetId, input.datasetId),
        eq(seedAssets.accepted, true),
        inArray(seedAssets.assetId, input.assetIds)
      )
    )
}

export function insertImageRecord(
  ex: Executor,
  row: typeof seedRecords.$inferInsert
) {
  return ex.insert(seedRecords).values(row).onConflictDoNothing()
}

export function listCleanupImages(ex: Executor, size: number) {
  return ex
    .select()
    .from(seedStorageIntents)
    .where(
      and(
        eq(seedStorageIntents.provider, "cloudinary"),
        eq(seedStorageIntents.state, "delete-pending")
      )
    )
    .limit(size)
}

export async function countAcceptedImages(ex: Executor, datasetId: string) {
  const [row] = await ex
    .select({ total: count() })
    .from(seedAssets)
    .where(
      and(eq(seedAssets.datasetId, datasetId), eq(seedAssets.accepted, true))
    )
  return row?.total ?? 0
}
