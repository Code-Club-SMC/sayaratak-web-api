import type { Transaction } from "~/shared/db/tx"
import { clock } from "~/shared/time/clock"

import * as q from "./promotions.queries"

/**
 * Ends the running promotions of these listings now. Unpaid ones keep
 * `pending_payment`: they never ran, the `promotions_dates` check needs dates
 * for an ended one, and their receipt is rejected with the account.
 */
export async function endPromotionsOf(tx: Transaction, listingIds: string[]) {
  if (listingIds.length === 0) return
  await q.updateEndedFor(tx, { listingIds, at: clock.now() })
}
