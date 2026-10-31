import type { Executor, Transaction } from "~/shared/db/tx"
import * as promotions from "~/modules/promotions/promotions.service"

import * as q from "./listings.queries"

/**
 * A deleted account's listings stay as rows, marked removed, so the admin
 * history keeps them (A2 "Account deletion"); their promotions end.
 */
export async function removeListingsOf(tx: Transaction, ownerUserId: string) {
  const ids = await q.updateRemovedOf(tx, ownerUserId)
  await promotions.endPromotionsOf(tx, ids)
}

/** Listings waiting in the admin moderation queue. */
export function countPendingListings(ex: Executor) {
  return q.countPending(ex)
}
