import { and, count, eq, inArray, ne, sum } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { reviews } from "./reviews.tables"

export function deleteOfTarget(ex: Executor, targetId: string) {
  return ex.delete(reviews).where(eq(reviews.targetId, targetId))
}

export function countFlagged(ex: Executor) {
  return ex.$count(reviews, eq(reviews.status, "flagged"))
}

/** Star totals of the shown (not hidden) reviews of each target. */
export function listStarsOf(ex: Executor, targetIds: string[]) {
  if (targetIds.length === 0) return Promise.resolve([])
  return ex
    .select({
      targetId: reviews.targetId,
      stars: sum(reviews.rating).mapWith(Number),
      count: count(),
    })
    .from(reviews)
    .where(
      and(inArray(reviews.targetId, targetIds), ne(reviews.status, "hidden"))
    )
    .groupBy(reviews.targetId)
}
