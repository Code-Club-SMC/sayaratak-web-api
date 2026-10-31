import { and, eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { uploads } from "./uploads.tables"

export function getUpload(ex: Executor, id: string) {
  return ex
    .select()
    .from(uploads)
    .where(eq(uploads.id, id))
    .then(([row]) => row)
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
