import { buildRankReport } from "@sayaratak/shared/lib/rank-report"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import type { RankReport } from "@sayaratak/shared/schemas/reports-rank"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import type { SessionUser } from "~/modules/auth/auth.types"
import * as businesses from "~/modules/businesses/businesses.service"
import * as messaging from "~/modules/messaging/messaging.service"
import * as reviews from "~/modules/reviews/reviews.service"

import { NO_COUNTS } from "./analytics.mapper"
import { countsPerTarget, windowsOf } from "./analytics.period"

/**
 * The city rank of the account's business (step 11.7-r8) among listed
 * businesses of its kind: views, contacts, rating and reply rate. The rules
 * live in the shared builder, so the mock matches; nothing about a peer
 * leaves the server but the counts.
 */
export async function getRankReport(
  user: SessionUser,
  query: PeriodQuery
): Promise<RankReport> {
  const { period, current } = windowsOf(query)
  const ref = await businesses.getBusinessRefOf(db, user.id)
  const now = clock.now().getTime()
  if (!ref) return buildRankReport({ period, selfId: null, peers: [], now })
  // ponytail: reads every peer's counters and threads per request; fine for a few hundred businesses of a kind, a nightly rank table past that.
  const rows = await businesses.listRankPeers(db, ref)
  const ids = rows.map((row) => row.id)
  const [counts, threads, stars] = await Promise.all([
    countsPerTarget(ids, current, period),
    messaging.listThreadsOfUsers(
      db,
      rows.map((row) => row.ownerUserId)
    ),
    reviews.getRatingSummaries(db, ids),
  ])
  return buildRankReport({
    period,
    selfId: ref.id,
    now,
    peers: rows.map((row) => {
      const c = counts.get(row.id) ?? NO_COUNTS
      const r = stars.get(row.id)
      return {
        id: row.id,
        cityId: row.cityId,
        views: c.views,
        calls: c.phoneClicks,
        whatsapp: c.whatsappClicks,
        threads: threads.get(row.ownerUserId) ?? [],
        // The star total back from the per-star counts.
        stars:
          r?.distribution.reduce((n, count, i) => n + count * (i + 1), 0) ?? 0,
        reviews: r?.count ?? 0,
      }
    }),
  })
}
