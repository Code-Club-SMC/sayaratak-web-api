import {
  buildDemandReport,
  demandScopeOf,
} from "@sayaratak/shared/lib/demand-report"
import { buildRepliesReport } from "@sayaratak/shared/lib/replies-report"
import { buildReviewsReport } from "@sayaratak/shared/lib/reviews-report"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import type { DemandReport } from "@sayaratak/shared/schemas/reports-demand"
import type { RepliesReport } from "@sayaratak/shared/schemas/reports-replies"
import type { ReviewsReport } from "@sayaratak/shared/schemas/reports-reviews"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import type { SessionUser } from "~/modules/auth/auth.types"
import * as businesses from "~/modules/businesses/businesses.service"
import * as listings from "~/modules/listings/listings.stats.service"
import * as messaging from "~/modules/messaging/messaging.service"
import * as reviews from "~/modules/reviews/reviews.service"

import { countsPerTarget, type Window, windowsOf } from "./analytics.period"

// The buckets a shared builder sums timestamps into.
const bucketsOf = (w: Window) => ({
  starts: w.starts,
  end: w.hourly ? (w.starts.at(-1) ?? "") : w.last,
  hourly: w.hourly,
})

/**
 * The Demand report (step 11.7-r6): market views per make and model in the
 * account's city (all Sudan when it has no city or under 50 live listings)
 * against the account's own live stock.
 */
export async function getDemandReport(
  user: SessionUser,
  query: PeriodQuery
): Promise<DemandReport> {
  const { period, current } = windowsOf(query)
  const [all, ref] = await Promise.all([
    listings.listDemandListings(db, clock.now()),
    businesses.getBusinessRefOf(db, user.id),
  ])
  const cityId = ref?.cityId ?? null
  const scope = demandScopeOf(
    cityId,
    all.filter((l) => l.live && l.cityId === cityId).length
  )
  // ponytail: reads every market listing's counters per request; a per-make roll-up table if the market grows past a few thousand listings.
  const market = all.filter((l) => scope === "country" || l.cityId === cityId)
  const counts = await countsPerTarget(
    market.map((l) => l.id),
    current,
    period
  )
  return buildDemandReport({
    period,
    scope,
    cityId,
    market: market.map((l) => ({
      makeId: l.makeId,
      modelId: l.modelId,
      views: counts.get(l.id)?.views ?? 0,
    })),
    stock: all
      .filter((l) => l.live && l.ownerUserId === user.id)
      .map((l) => ({ makeId: l.makeId, modelId: l.modelId })),
  })
}

/** The Responsiveness report (step 11.7-r6): replies to buyer messages. */
export async function getRepliesReport(
  user: SessionUser,
  query: PeriodQuery
): Promise<RepliesReport> {
  const { period } = windowsOf(query)
  return buildRepliesReport({
    period,
    threads: await messaging.listThreadsForReport(db, user.id),
    now: clock.now().getTime(),
  })
}

/** The Reviews report (step 11.7-r6) of the account's business; none without one. */
export async function getReviewsReport(
  user: SessionUser,
  query: PeriodQuery
): Promise<ReviewsReport> {
  const { period, current, compare } = windowsOf(query)
  const ref = await businesses.getBusinessRefOf(db, user.id)
  return buildReviewsReport({
    period,
    reviews: ref ? await reviews.listReportReviews(db, ref.id) : [],
    current: bucketsOf(current),
    compare: bucketsOf(compare),
  })
}
