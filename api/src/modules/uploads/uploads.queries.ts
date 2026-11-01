import { and, eq } from "drizzle-orm"

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
