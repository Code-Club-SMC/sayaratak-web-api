import { asc, count, desc, eq, inArray, sql } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { reports } from "./reports.tables"

export type NewReportRow = typeof reports.$inferInsert

export function countOpen(ex: Executor) {
  return ex.$count(reports, eq(reports.status, "open"))
}

export function insert(ex: Executor, row: NewReportRow) {
  return ex
    .insert(reports)
    .values(row)
    .returning()
    .then(([inserted]) => {
      // One row in, one row back; anything else is a driver fault.
      if (!inserted) throw new Error("insert into reports returned no row")
      return inserted
    })
}

/** The newest reports, ties in the mock's id order (`rp-2` before `rp-10`). */
export function listNewest(ex: Executor, limit: number) {
  return ex
    .select({
      id: reports.id,
      listingId: reports.listingId,
      reason: reports.reason,
      createdAt: reports.createdAt,
    })
    .from(reports)
    .orderBy(
      desc(reports.createdAt),
      asc(sql`length(${reports.id})`),
      asc(reports.id)
    )
    .limit(limit)
}

/** How many reports each of these listings has, whatever their state. */
export function countPerListing(ex: Executor, listingIds: string[]) {
  return ex
    .select({ listingId: reports.listingId, count: count() })
    .from(reports)
    .where(inArray(reports.listingId, listingIds))
    .groupBy(reports.listingId)
}

/** Step 11.7-r12a: reason, state and times of every report, for the admin Trust & safety tab. */
export function listForTrust(ex: Executor) {
  return ex
    .select({
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
      decidedAt: reports.decidedAt,
    })
    .from(reports)
}
