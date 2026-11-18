import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import type { AdminStats } from "@sayaratak/shared/schemas/responses"

import { db } from "~/shared/db/client"
import {
  bucket,
  total,
  type Window,
  windowsOf,
} from "~/modules/analytics/analytics.period"
import * as users from "~/modules/auth/auth.overview.service"
import * as businesses from "~/modules/businesses/businesses.overview.service"
import * as listings from "~/modules/listings/listings.overview.service"
import * as payments from "~/modules/payments/payments.service"
import * as plans from "~/modules/plans/plans.service"

/**
 * `GET /admin/stats`: the dashboard totals and three series over the period
 * (a 7, 30 or 90 Khartoum-day preset or custom minutes), plus the compare
 * window bucketed the same way. Revenue counts approved payments at the time
 * they were decided, so its total is the sum of its series.
 */
export async function getStats(query: PeriodQuery): Promise<AdminStats> {
  const { period, current, compare, align, compareStarts } = windowsOf(query)
  const read = async (w: Window) => {
    const [newListings, newUsers, revenue] = await Promise.all([
      listings.countCreatedPerDay(db, w),
      users.countUsersPerDay(db, w),
      payments.sumApprovedPerDay(db, w),
    ])
    return {
      newListings: bucket(w, newListings),
      newUsers: bucket(w, newUsers),
      revenue: bucket(w, revenue),
    }
  }
  const [count, now, before] = await Promise.all([
    readCounts(),
    read(current),
    read(compare),
  ])
  const points = (values: number[], starts: string[]) =>
    starts.map((date, i) => ({ date, value: values[i] ?? 0 }))
  return {
    period,
    totals: { ...count, revenue: total(now.revenue) },
    series: {
      newListings: points(now.newListings, current.starts),
      newUsers: points(now.newUsers, current.starts),
      revenue: points(now.revenue, current.starts),
    },
    previousSeries: {
      newListings: points(align(before.newListings), compareStarts),
      newUsers: points(align(before.newUsers), compareStarts),
      revenue: points(align(before.revenue), compareStarts),
    },
    previousRevenue: total(before.revenue),
  }
}

async function readCounts() {
  // Independent reads.
  const [userCount, approved, profiles, activeSubscriptions] =
    await Promise.all([
      users.countUsers(db),
      listings.countApproved(db),
      businesses.countBusinesses(db),
      plans.countActiveSubscriptions(db),
    ])
  return { users: userCount, ...approved, ...profiles, activeSubscriptions }
}
