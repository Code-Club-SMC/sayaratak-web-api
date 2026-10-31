import type { Executor, Transaction } from "~/shared/db/tx"

import * as q from "./messaging.queries"

/**
 * A deleted account's threads go with it, the other side's copy too, as in
 * the mock (A2 "Account deletion").
 */
export async function deleteThreadsOf(tx: Transaction, userId: string) {
  await q.deleteThreadsOf(tx, userId)
}

/** Unread messages from others in the user's threads. */
export function countUnreadMessages(ex: Executor, userId: string) {
  return q.countUnread(ex, userId)
}
