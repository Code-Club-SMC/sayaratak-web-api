import type { Executor, Transaction } from "~/shared/db/tx"
import type { DayRange } from "~/shared/time/khartoum"

import * as q from "./reviews.queries"

/** Deletes the reviews of a business that is going away. */
export async function deleteReviewsOf(tx: Transaction, targetId: string) {
  await q.deleteOfTarget(tx, targetId)
}

/** Reviews waiting in the admin flagged queue. */
export function countFlaggedReviews(ex: Executor) {
  return q.countFlagged(ex)
}

/**
 * The average star rating of each target with shown reviews, to one decimal
 * as the mock's `ratingFrom` (4 and 5 stars give 4.5). Targets without one are left out.
 */
export async function getRatingsOf(ex: Executor, targetIds: string[]) {
  const rows = await q.listStarsOf(ex, targetIds)
  return new Map(
    rows.map((row) => [
      row.targetId,
      Math.round((row.stars / row.count) * 10) / 10,
    ])
  )
}

/** Reviews written about these businesses inside the days (`null`: every business), hidden ones too. */
export function countNewReviews(
  ex: Executor,
  targetIds: string[] | null,
  days: DayRange
) {
  if (targetIds?.length === 0) return Promise.resolve(0)
  return q.countWrittenIn(ex, targetIds, days)
}
