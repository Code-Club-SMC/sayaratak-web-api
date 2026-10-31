import { eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { reports } from "./reports.tables"

export function countOpen(ex: Executor) {
  return ex.$count(reports, eq(reports.status, "open"))
}
