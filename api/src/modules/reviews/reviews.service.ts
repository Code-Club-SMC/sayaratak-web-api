import type { Rating } from "@sayaratak/shared/schemas/review"

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

/**
 * The rating each business shows: average to one decimal, review count, and
 * the count per star (the mock's `ratingFrom`). Hidden reviews are left out;
 * a business with none reads `{ avg: 0, count: 0, distribution: [0, 0, 0, 0, 0] }`.
 * Example: one 5 and one 4 give `{ avg: 4.5, count: 2, distribution: [0, 0, 0, 1, 1] }`.
 */
export async function getRatingSummaries(ex: Executor, targetIds: string[]) {
  const rows = await q.listStarCountsOf(ex, targetIds)
  const summaries = new Map<string, Rating>()
  for (const id of targetIds)
    summaries.set(id, { avg: 0, count: 0, distribution: [0, 0, 0, 0, 0] })
  const totals = new Map<string, number>()
  for (const row of rows) {
    const summary = summaries.get(row.targetId)
    if (!summary) continue
    summary.count += row.count
    summary.distribution[row.stars - 1] = row.count
    totals.set(
      row.targetId,
      (totals.get(row.targetId) ?? 0) + row.stars * row.count
    )
  }
  for (const [id, summary] of summaries)
    if (summary.count > 0)
      summary.avg =
        Math.round(((totals.get(id) ?? 0) / summary.count) * 10) / 10
  return summaries
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
