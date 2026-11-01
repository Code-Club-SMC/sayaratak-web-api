import type { Executor } from "~/shared/db/tx"

import * as q from "./plans.queries"

/**
 * The account's active subscription, if any. A10: an ended free plan stays
 * `active` until the subscription job renews it, so a dealership is never
 * left at 0 listings for the hour in between.
 */
export function getActiveSubscription(ex: Executor, userId: string) {
  return q.getActiveSubscription(ex, userId)
}
