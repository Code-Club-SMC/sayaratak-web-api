import type { Executor } from "~/shared/db/tx"

import * as q from "./verification.queries"

/** Verification requests waiting in the admin queue. */
export function countPendingVerifications(ex: Executor) {
  return q.countPending(ex)
}
