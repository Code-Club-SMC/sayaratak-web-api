import { buildListingsReport } from "@sayaratak/shared/lib/listings-report"
import type {
  ListingsReport,
  ListingsReportQuery,
} from "@sayaratak/shared/schemas/reports"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import type { SessionUser } from "~/modules/auth/auth.types"
import * as listings from "~/modules/listings/listings.stats.service"
import * as messaging from "~/modules/messaging/messaging.service"

import { NO_COUNTS } from "./analytics.mapper"
import { countsPerTarget, windowsOf } from "./analytics.period"

/**
 * The Listings report of the signed-in account (step 11.7-r5): its approved
 * listings with the period's views, taps and messages, flags, stock age and
 * days to sell. The rules live in the shared builder, so the mock matches.
 */
export async function getListingsReport(
  user: SessionUser,
  query: ListingsReportQuery
): Promise<ListingsReport> {
  const { period, current } = windowsOf(query)
  const rows = await listings.listReportListings(db, user.id)
  const ids = rows.map((row) => row.id)
  const [counts, received] = await Promise.all([
    countsPerTarget(ids, current, period),
    messaging.countReceivedPerListing(db, user.id, current),
  ])
  return buildListingsReport({
    period,
    query,
    now: clock.now().getTime(),
    rows: rows.map((row) => {
      const c = counts.get(row.id) ?? NO_COUNTS
      return {
        ...row,
        views: c.views,
        calls: c.phoneClicks,
        whatsapp: c.whatsappClicks,
        messages: received.get(row.id) ?? 0,
      }
    }),
  })
}
