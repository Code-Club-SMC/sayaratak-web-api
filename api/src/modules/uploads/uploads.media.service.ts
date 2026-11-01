import type { Media } from "@sayaratak/shared/schemas/listing"

import { db } from "~/shared/db/client"
import { type Executor, afterCommit, type Transaction } from "~/shared/db/tx"
import { files } from "~/shared/files/store"
import { fail } from "~/shared/http/errors"
import { newId } from "~/shared/text/ids"
import { clock } from "~/shared/time/clock"

import { toMedia } from "./uploads.mapper"
import * as q from "./uploads.queries"
import { toUrl, type UploadRow } from "./uploads.service"

const ID_PREFIX = "up"
const MEDIA_KINDS = new Set(["image", "video"])

/** Each photo or video with these ids as a `Media`, keyed by id. Unknown ids are left out. */
export async function getMediaOf(ex: Executor, ids: string[]) {
  const rows = await q.listUploads(ex, ids)
  const posters = await q.listUploads(ex, posterIdsOf(rows))
  const posterById = new Map(posters.map((row) => [row.id, row]))
  const media = new Map<string, Media>()
  for (const row of rows) {
    const poster = row.posterId ? posterById.get(row.posterId) : undefined
    media.set(
      row.id,
      toMedia(
        { row, url: toUrl(row) },
        poster ? { row: poster, url: toUrl(poster) } : null
      )
    )
  }
  return media
}

/**
 * Marks photos and videos attached to something (A8). Each must be the
 * owner's own public photo or video, and either new or already one of
 * `kept` (the target's current media); anything else is 422 on `media`.
 */
export async function attachMedia(
  tx: Transaction,
  attach: { ownerUserId: string; ids: string[]; kept: string[] }
) {
  const rows = await q.listUploads(tx, attach.ids)
  const usable = rows.filter(
    (row) =>
      row.ownerUserId === attach.ownerUserId &&
      MEDIA_KINDS.has(row.kind) &&
      row.delivery === "public" &&
      (row.attachedAt === null || attach.kept.includes(row.id))
  )
  // The web's photo field shows "Required" next to the photos; no finer key exists.
  if (usable.length !== new Set(attach.ids).size)
    fail.validation({ media: "validation.required" })
  const ids = [...attach.ids, ...posterIdsOf(rows)]
  await q.updateAttached(tx, { ids, at: clock.now() })
}

/**
 * Copies upload rows for a duplicated listing: new ids, same file. The file
 * host keeps one copy; `deleteMediaFiles` removes it only once no row uses it.
 */
export async function copyMedia(
  tx: Transaction,
  copy: { ids: string[]; ownerUserId: string }
) {
  const rows = await q.listUploads(tx, copy.ids)
  const posters = await q.listUploads(tx, posterIdsOf(rows))
  const now = clock.now()
  const posterCopies = new Map(posters.map((row) => [row.id, newId(ID_PREFIX)]))
  const copyOf = (row: UploadRow, id: string, posterId: string | null) => ({
    ...row,
    id,
    posterId,
    ownerUserId: copy.ownerUserId,
    attachedAt: now,
    createdAt: now,
  })
  await q.insertUploads(
    tx,
    posters.map((row) => copyOf(row, posterCopies.get(row.id) ?? "", null))
  )
  const byId = new Map(rows.map((row) => [row.id, row]))
  const ids = copy.ids.map(() => newId(ID_PREFIX))
  await q.insertUploads(
    tx,
    copy.ids.flatMap((id, i) => {
      const row = byId.get(id)
      if (!row) return []
      const posterId = row.posterId
        ? (posterCopies.get(row.posterId) ?? null)
        : null
      return [copyOf(row, ids[i] ?? "", posterId)]
    })
  )
  return ids
}

/**
 * Deletes upload rows (and their posters), then, after the commit, each file
 * on the host that no other row still uses (A8). A failed host delete is
 * logged and never blocks the user.
 */
export async function deleteMediaFiles(tx: Transaction, ids: string[]) {
  const rows = await q.listUploads(tx, ids)
  const deleted = await q.deleteUploads(tx, [...ids, ...posterIdsOf(rows)])
  // The transaction is closed by then, so the check reads with `db`.
  afterCommit(tx, async () => {
    for (const row of deleted) {
      if (!row.cloudinaryId || (await q.hasCloudinaryId(db, row.cloudinaryId)))
        continue
      await files.remove({
        publicId: row.cloudinaryId,
        mime: row.mime ?? "",
        delivery: row.delivery,
      })
    }
  })
}

function posterIdsOf(rows: UploadRow[]) {
  return rows.flatMap((row) => (row.posterId ? [row.posterId] : []))
}
