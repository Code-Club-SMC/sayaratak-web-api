import type { Executor } from "~/shared/db/tx"

import * as q from "./uploads.queries"

/**
 * The address a page shows for an upload. Demo files carry their own `url`;
 * Cloudinary delivery URLs come with 4.2 (A8).
 */
export async function uploadUrl(ex: Executor, id: string | null) {
  if (!id) return undefined
  const row = await q.getUpload(ex, id)
  return row?.url ?? undefined
}

/**
 * The user's own image upload behind an address the web sends back (an avatar).
 * Demo uploads match on `url`; Cloudinary addresses come with 4.2.
 */
export function getOwnImageId(
  ex: Executor,
  image: { ownerUserId: string; url: string }
) {
  return q.getImageIdByUrl(ex, image)
}
