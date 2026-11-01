import { and, eq, inArray, isNull } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { type NewUploadRow, uploads } from "./uploads.tables"

export function getUpload(ex: Executor, id: string) {
  return ex
    .select()
    .from(uploads)
    .where(eq(uploads.id, id))
    .then(([row]) => row)
}

export function insertUpload(ex: Executor, row: NewUploadRow) {
  return ex
    .insert(uploads)
    .values(row)
    .returning()
    .then(([inserted]) => {
      // One row in, one row back; anything else is a driver fault.
      if (!inserted) throw new Error("insert into uploads returned no row")
      return inserted
    })
}

export function getImageIdByUrl(
  ex: Executor,
  image: { ownerUserId: string; url: string }
) {
  return ex
    .select({ id: uploads.id })
    .from(uploads)
    .where(
      and(
        eq(uploads.ownerUserId, image.ownerUserId),
        eq(uploads.url, image.url),
        eq(uploads.kind, "image")
      )
    )
    .then(([row]) => row?.id)
}

export function getImageIdByCloudinaryId(
  ex: Executor,
  image: { ownerUserId: string; cloudinaryId: string }
) {
  return ex
    .select({ id: uploads.id })
    .from(uploads)
    .where(
      and(
        eq(uploads.ownerUserId, image.ownerUserId),
        eq(uploads.cloudinaryId, image.cloudinaryId),
        eq(uploads.kind, "image"),
        eq(uploads.delivery, "public")
      )
    )
    .then(([row]) => row?.id)
}

export function listUploads(ex: Executor, ids: string[]) {
  if (ids.length === 0) return Promise.resolve([])
  return ex.select().from(uploads).where(inArray(uploads.id, ids))
}

export function updateAttached(
  ex: Executor,
  change: { ids: string[]; at: Date }
) {
  return ex
    .update(uploads)
    .set({ attachedAt: change.at })
    .where(and(inArray(uploads.id, change.ids), isNull(uploads.attachedAt)))
}

export function insertUploads(ex: Executor, rows: NewUploadRow[]) {
  if (rows.length === 0) return Promise.resolve([])
  return ex.insert(uploads).values(rows).returning()
}

export function deleteUploads(ex: Executor, ids: string[]) {
  if (ids.length === 0) return Promise.resolve([])
  return ex.delete(uploads).where(inArray(uploads.id, ids)).returning()
}

export function hasCloudinaryId(ex: Executor, cloudinaryId: string) {
  return ex
    .select({ id: uploads.id })
    .from(uploads)
    .where(eq(uploads.cloudinaryId, cloudinaryId))
    .limit(1)
    .then((rows) => rows.length > 0)
}
