import { eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { listings } from "./listings.tables"

/** Marks every listing of the owner removed and returns their ids. */
export function updateRemovedOf(ex: Executor, ownerUserId: string) {
  return ex
    .update(listings)
    .set({ moderation: "removed" })
    .where(eq(listings.ownerUserId, ownerUserId))
    .returning({ id: listings.id })
    .then((rows) => rows.map((row) => row.id))
}

export function countPending(ex: Executor) {
  return ex.$count(listings, eq(listings.moderation, "pending"))
}
