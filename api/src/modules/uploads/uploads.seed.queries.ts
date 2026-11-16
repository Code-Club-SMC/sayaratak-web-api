import { and, eq, inArray } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"
import type { StoredFile } from "~/shared/files/store"

import { fileDeletions, type NewUploadRow, uploads } from "./uploads.tables"

export async function insertSeedReservation(ex: Executor, row: NewUploadRow) {
  await ex.insert(uploads).values(row).onConflictDoNothing()
}

export function updateSeedStored(
  ex: Executor,
  input: { id: string; stored: StoredFile }
) {
  return ex
    .update(uploads)
    .set({
      width: input.stored.width,
      height: input.stored.height,
      placeholderColor: input.stored.placeholderColor,
    })
    .where(eq(uploads.id, input.id))
}

export function listSeedUploads(
  ex: Executor,
  input: { datasetId: string; ids: string[] }
) {
  if (!input.ids.length) return Promise.resolve([])
  // Sorted upload locks follow dataset, operation and public record locks in the caller.
  return ex
    .select()
    .from(uploads)
    .where(
      and(
        eq(uploads.seedDatasetId, input.datasetId),
        inArray(uploads.id, input.ids)
      )
    )
    .orderBy(uploads.id)
    .for("update")
}

export function updateSeedAttached(
  ex: Executor,
  input: { ids: string[]; ownerUserId: string; at: Date }
) {
  if (!input.ids.length) return Promise.resolve()
  return ex
    .update(uploads)
    .set({
      ownerUserId: input.ownerUserId,
      attachedAt: input.at,
    })
    .where(inArray(uploads.id, input.ids))
}

export function insertSeedDeletion(
  ex: Executor,
  input: { id: string; publicId: string; mime: string; at: Date }
) {
  return ex
    .insert(fileDeletions)
    .values({
      id: input.id,
      publicId: input.publicId,
      mime: input.mime,
      delivery: "public",
      createdAt: input.at,
    })
    .onConflictDoNothing()
}

export async function hasSeedDeletion(ex: Executor, id: string) {
  const rows = await ex
    .select({ id: fileDeletions.id })
    .from(fileDeletions)
    .where(eq(fileDeletions.id, id))
  return rows.length > 0
}
