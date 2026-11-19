import { buildAlertsReport } from "@sayaratak/shared/lib/alerts-report"
import { instantOf } from "@sayaratak/shared/lib/period"
import { buildSpendingReport } from "@sayaratak/shared/lib/spending-report"
import type { Period, PeriodQuery } from "@sayaratak/shared/schemas/period"
import type { AlertsReport } from "@sayaratak/shared/schemas/reports-alerts"
import type { SpendingReport } from "@sayaratak/shared/schemas/reports-spending"

import { db } from "~/shared/db/client"
import type { SessionUser } from "~/modules/auth/auth.types"
import { listSearchMatchedAt } from "~/modules/listings/listings.search.service"
import * as payments from "~/modules/payments/payments.service"
import { listSavedSearches } from "~/modules/saved-searches/saved-searches.service"

import { bucketsOf } from "./analytics.activity-reports.service"
import { windowsOf } from "./analytics.period"

// The span both windows cover: the compare window always starts first.
const spanOf = (period: Period) => ({
  since: new Date(instantOf(period.compareFrom)),
  until: new Date(instantOf(period.to)),
})

/** The Spending report (step 11.7-r9): the account's Bankak receipts by the day they were sent. */
export async function getSpendingReport(
  user: SessionUser,
  query: PeriodQuery
): Promise<SpendingReport> {
  const { period, current, compare } = windowsOf(query)
  return buildSpendingReport({
    period,
    payments: await payments.listSpendOf(db, {
      userId: user.id,
      since: spanOf(period).since,
    }),
    current: bucketsOf(current),
    compare: bucketsOf(compare),
  })
}

/** The saved-search Alerts report (step 11.7-r9): listings of others that went public in each window and fit each saved search. */
export async function getAlertsReport(
  user: SessionUser,
  query: PeriodQuery
): Promise<AlertsReport> {
  const { period, current, compare } = windowsOf(query)
  const span = spanOf(period)
  // ponytail: one listings query per saved search; people keep a handful, cap or batch if that grows.
  const searches = await Promise.all(
    (await listSavedSearches(user)).map(async (s) => ({
      ...s,
      matchedAt: await listSearchMatchedAt(db, {
        ...span,
        params: s.params,
        exceptOwnerId: user.id,
      }),
    }))
  )
  return buildAlertsReport({
    period,
    searches,
    current: bucketsOf(current),
    compare: bucketsOf(compare),
  })
}
