import type { Executor } from "~/shared/db/tx"

import * as q from "./reports.queries"

/** Reports waiting in the admin queue. */
export function countOpenReports(ex: Executor) {
  return q.countOpen(ex)
}
