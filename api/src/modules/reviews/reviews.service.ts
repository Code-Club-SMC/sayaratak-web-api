import type { Executor, Transaction } from "~/shared/db/tx"

import * as q from "./reviews.queries"

/** Deletes the reviews of a business that is going away. */
export async function deleteReviewsOf(tx: Transaction, targetId: string) {
  await q.deleteOfTarget(tx, targetId)
}

/** Reviews waiting in the admin flagged queue. */
export function countFlaggedReviews(ex: Executor) {
  return q.countFlagged(ex)
}
