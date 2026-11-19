import { daysOf } from "@sayaratak/shared/lib/period"
import { buildSearchReport } from "@sayaratak/shared/lib/search-report"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import type { SearchReport } from "@sayaratak/shared/schemas/reports-search"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import { windowsOf } from "~/modules/analytics/analytics.period"
import { listSearchDays } from "~/modules/analytics/analytics.search.service"
import { listMarketListings } from "~/modules/listings/listings.stats.service"

/** The admin Search demand tab: searches from the daily search log over both windows, against the vehicle listings live now (step 11.7-r13). */
export async function getSearchReport(
  query: PeriodQuery
): Promise<SearchReport> {
  const { period } = windowsOf(query)
  const a = daysOf(period.compareFrom, period.compareTo)
  const b = daysOf(period.from, period.to)
  const [rows, listings] = await Promise.all([
    // The compare window always comes before the current one.
    listSearchDays({ first: a.first, last: b.last }),
    listMarketListings(db),
  ])
  return buildSearchReport({
    period,
    rows,
    listings,
    now: clock.now().getTime(),
  })
}
