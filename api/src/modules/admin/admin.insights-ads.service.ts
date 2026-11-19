import { buildAdsReport } from "@sayaratak/shared/lib/ads-report"
import type { Period, PeriodQuery } from "@sayaratak/shared/schemas/period"
import type { AdsReport } from "@sayaratak/shared/schemas/reports-ads"

import { db } from "~/shared/db/client"
import {
  listAdminAdPages,
  listAdminCampaigns,
} from "~/modules/ads/ads.admin.service"
import { listAdminBanners } from "~/modules/ads/ads.banners.admin.service"
import {
  bannerSeries,
  type Window,
  windowsOf,
} from "~/modules/analytics/analytics.period"

// Banner views and clicks of one ad per bucket of both windows.
async function adCounts(
  id: string,
  windows: { current: Window; compare: Window; period: Period }
) {
  const [a, b] = await Promise.all([
    bannerSeries(id, windows.current, windows.period),
    bannerSeries(id, windows.compare, windows.period),
  ])
  return {
    current: { views: a.impressions, clicks: a.clicks },
    compare: { views: b.impressions, clicks: b.clicks },
  }
}

// ponytail: two counter reads per ad; one grouped read per window if the ad count grows past a few hundred.
/** The admin Ads tab: campaign and banner click rate per bucket, slot fill of approved campaigns per page, and every ad of the period (step 11.7-r12b). */
export async function getAdsReport(query: PeriodQuery): Promise<AdsReport> {
  const windows = windowsOf(query)
  const { period, current, compare } = windows
  const [campaigns, banners, pages] = await Promise.all([
    listAdminCampaigns(db),
    listAdminBanners(db),
    listAdminAdPages(db),
  ])
  const approved = campaigns.filter((c) => c.status === "approved")
  return buildAdsReport({
    period,
    campaigns: await Promise.all(
      approved.map(async (c) => ({
        id: c.id,
        name: c.ownerName,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        pages: c.pages,
        ...(await adCounts(c.id, windows)),
      }))
    ),
    banners: await Promise.all(
      banners.map(async (b) => ({
        id: b.id,
        name: b.title,
        startsAt: b.startsAt,
        endsAt: b.endsAt,
        active: b.active,
        placement: b.placement,
        ...(await adCounts(b.id, windows)),
      }))
    ),
    pages: pages.map((p) => ({ id: p.id, slots: p.slots, enabled: p.enabled })),
    current,
    compare,
  })
}
