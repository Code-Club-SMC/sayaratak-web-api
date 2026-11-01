import { eq } from "drizzle-orm"

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
