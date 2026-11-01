import type { Executor } from "~/shared/db/tx"
import { containing } from "~/shared/text/like"
import type { DayRange } from "~/shared/time/khartoum"

import * as q from "./listings.overview.queries"

/** Approved listings, and how many of them are vehicles (parts make up the rest). */
export async function countApproved(ex: Executor) {
  // Two independent reads.
  const [listings, vehicles] = await Promise.all([
    q.countApproved(ex),
    q.countApprovedVehicles(ex),
  ])
  return { listings, vehicles }
}

/** Listings created per Khartoum day, as a day to count map. */
export async function countCreatedPerDay(ex: Executor, days: DayRange) {
  const rows = await q.listCreatedPerDay(ex, days)
  return new Map(rows.map((row) => [row.day, row.count]))
}

/** The newest listings that were sent in, newest first, for the admin activity feed. */
export function listNewestSubmitted(ex: Executor, limit: number) {
  return q.listNewestSubmitted(ex, limit)
}

/** Up to `limit` listings whose title or id holds `term`, for the admin search. */
export function searchListings(
  ex: Executor,
  find: { term: string; limit: number }
) {
  return q.search(ex, { pattern: containing(find.term), limit: find.limit })
}
