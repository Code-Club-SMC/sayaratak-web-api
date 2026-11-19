import type { Executor } from "~/shared/db/tx"

import { plans, subscriptions } from "./plans.tables"

/** Every subscription as the admin Revenue tab reads it (step 11.7-r11). */
export function listSubscriptionsForReport(ex: Executor) {
  return ex
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      planId: subscriptions.planId,
      status: subscriptions.status,
      startsAt: subscriptions.startsAt,
      endsAt: subscriptions.endsAt,
      price: subscriptions.price,
    })
    .from(subscriptions)
}

/** Every plan's id, name and audience. */
export function listPlanNames(ex: Executor) {
  return ex
    .select({ id: plans.id, name: plans.name, audience: plans.audience })
    .from(plans)
}
