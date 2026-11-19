import { buildMarketplaceReport } from "@sayaratak/shared/lib/marketplace-report"
import {
  activityDaysOf,
  buildUsersReport,
} from "@sayaratak/shared/lib/users-report"
import { buildRevenueReport } from "@sayaratak/shared/lib/revenue-report"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import type {
  MarketplaceReport,
  UsersReport,
} from "@sayaratak/shared/schemas/reports-insights"
import type { RevenueReport } from "@sayaratak/shared/schemas/reports-revenue"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import * as active from "~/modules/analytics/analytics.active.service"
import { bucketsOf } from "~/modules/analytics/analytics.activity-reports.service"
import { windowsOf } from "~/modules/analytics/analytics.period"
import {
  listAccountRoles,
  listUsersForReport,
} from "~/modules/auth/auth.overview.service"
import { getBusinessesOfOwners } from "~/modules/businesses/businesses.admin.service"
import { listMarketListings } from "~/modules/listings/listings.stats.service"
import { listFirstListingMessageDays } from "~/modules/messaging/messaging.service"
import { listPaymentsForRevenue } from "~/modules/payments/payments.service"
import * as plans from "~/modules/plans/plans.report.service"

const earlier = (a: string | undefined, b: string) => (a && a < b ? a : b)

// Step 11.7-r10. ponytail: reads every listing and account per request, like the Demand report; a nightly roll-up if the market grows past tens of thousands.

/** The admin Marketplace tab: stock, flow, contact within 7 days, lifecycle, splits and typical prices. */
export async function getMarketplaceReport(
  query: PeriodQuery
): Promise<MarketplaceReport> {
  const { period, current, compare } = windowsOf(query)
  // Listings that went live in the compare window were contacted on or after its first day.
  const since = compare.first
  const [listings, clicks, messages] = await Promise.all([
    listMarketListings(db),
    active.listFirstClickDays(since),
    listFirstListingMessageDays(db, since),
  ])
  const first = new Map<string, string>()
  for (const c of clicks)
    if (c.day) first.set(c.targetId, earlier(first.get(c.targetId), c.day))
  const owners = new Map(listings.map((l) => [l.id, l.ownerUserId]))
  for (const m of messages)
    if (owners.get(m.listingId) !== m.senderId)
      first.set(m.listingId, earlier(first.get(m.listingId), m.day))
  return buildMarketplaceReport({
    period,
    listings: listings.map((l) => ({
      ...l,
      firstContactDay: first.get(l.id) ?? null,
    })),
    current: bucketsOf(current),
    compare: bucketsOf(compare),
    now: clock.now().getTime(),
  })
}

/** The admin Users tab: sign-ups, active accounts, devices and languages. */
export async function getUsersReport(query: PeriodQuery): Promise<UsersReport> {
  const { period, current, compare } = windowsOf(query)
  const [users, activity, activeSince] = await Promise.all([
    listUsersForReport(db),
    active.listActivity(activityDaysOf(period)),
    active.firstActivityDay(),
  ])
  return buildUsersReport({
    period,
    users,
    activity,
    activeSince,
    current: bucketsOf(current),
    compare: bucketsOf(compare),
  })
}

/** The admin Revenue tab: approved money, receipt outcomes, paid subscriptions, renewal, money per business and plans ending soon (step 11.7-r11). */
export async function getRevenueReport(
  query: PeriodQuery
): Promise<RevenueReport> {
  const { period, current, compare } = windowsOf(query)
  const [payments, subs, roles, planNames] = await Promise.all([
    listPaymentsForRevenue(db),
    plans.listSubscriptionsForReport(db),
    listAccountRoles(db),
    plans.listPlanNames(db),
  ])
  const businesses = await getBusinessesOfOwners(
    db,
    roles
      .filter((r) => r.role !== "user" && r.role !== "admin")
      .map((r) => r.id)
  )
  return buildRevenueReport({
    period,
    payments,
    subs,
    accounts: roles.map((r) => {
      const b = businesses.get(r.id)
      return {
        id: r.id,
        role: r.role,
        name: b?.name ?? { ar: r.name, en: r.name },
        businessId: b?.id ?? null,
      }
    }),
    plans: planNames,
    current: bucketsOf(current),
    compare: bucketsOf(compare),
    now: clock.now().getTime(),
  })
}
