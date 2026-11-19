import { buildAlertsReport } from "@sayaratak/shared/lib/alerts-report"
import { buildSpendingReport } from "@sayaratak/shared/lib/spending-report"
import { alertsReportSchema } from "@sayaratak/shared/schemas/reports-alerts"
import { spendingReportSchema } from "@sayaratak/shared/schemas/reports-spending"

import { db } from "../db"
import { needUser, route } from "../http"
import { periodOf } from "../period"
import { matches } from "../search"

// Step 11.7-r9: the personal Spending and Alerts tabs. The rules are the shared builders', as in the api; this file only gathers their inputs.

function windowsOf(query: URLSearchParams) {
  const { period, current, compare } = periodOf(query)
  const hourly = period.granularity === "hour"
  const bucketsOf = (w: typeof current) => ({
    starts: w.starts,
    end: hourly ? (w.starts.at(-1) ?? "") : w.last,
    hourly,
  })
  return { period, current: bucketsOf(current), compare: bucketsOf(compare) }
}

route("GET", "/me/reports/spending", (c) => {
  const user = needUser(c)
  return spendingReportSchema.parse(
    buildSpendingReport({
      ...windowsOf(c.query),
      payments: db.payments.filter((p) => p.userId === user.id),
    })
  )
})

route("GET", "/me/reports/alerts", (c) => {
  const user = needUser(c)
  return alertsReportSchema.parse(
    buildAlertsReport({
      ...windowsOf(c.query),
      searches: db.savedSearches
        .filter((s) => s.userId === user.id)
        .map(({ userId: _, ...s }) => {
          const params = { ...s.params, includeSold: true }
          return {
            ...s,
            // Public at the admin decision, else at creation (as the api).
            matchedAt: db.listings
              .filter((l) => l.ownerUserId !== user.id && matches(l, params))
              .map((l) => l.decidedAt ?? l.createdAt),
          }
        }),
    })
  )
})
