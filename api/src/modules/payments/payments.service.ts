import type { Executor, Transaction } from "~/shared/db/tx"
import { clock } from "~/shared/time/clock"

import * as q from "./payments.queries"

// The reason the web shows on a receipt rejected because its sender left.
const ACCOUNT_DELETED = "account_deleted"

/**
 * A deleted account's payments stay as financial records; those still under
 * review are rejected (A2 "Account deletion").
 */
export async function rejectPendingOf(tx: Transaction, userId: string) {
  await q.updateRejectedOf(tx, {
    userId,
    reason: ACCOUNT_DELETED,
    at: clock.now(),
  })
}

/** Receipts waiting in the admin payments queue. */
export function countPendingPayments(ex: Executor) {
  return q.countPending(ex)
}
