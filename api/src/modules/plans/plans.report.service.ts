import type { SubscriptionInput } from "@sayaratak/shared/lib/subscriptions-report"

import type { Executor } from "~/shared/db/tx"

import * as q from "./plans.report.queries"

/** Every subscription with ISO dates, for the admin Revenue tab (step 11.7-r11). */
export async function listSubscriptionsForReport(
  ex: Executor
): Promise<SubscriptionInput[]> {
  const rows = await q.listSubscriptionsForReport(ex)
  return rows.map((row) => ({
    ...row,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
  }))
}

/** Every plan's id, name and audience. */
export function listPlanNames(ex: Executor) {
  return q.listPlanNames(ex)
}
