import type { Transaction } from "~/shared/db/tx"

import * as q from "./analytics.queries"

/** Deletes the view and click counters of a business that is going away. */
export async function deleteEventsOf(tx: Transaction, targetId: string) {
  await q.deleteOfTarget(tx, targetId)
}
