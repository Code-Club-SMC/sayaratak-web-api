import { describe, expect, test } from "vitest"

import {
  type AdsBannerInput,
  type AdsCampaignInput,
  buildAdsReport,
} from "@sayaratak/shared/lib/ads-report"
import {
  bucketsOf,
  instantOf,
  resolvePeriod,
} from "@sayaratak/shared/lib/period"
import { adsReportSchema } from "@sayaratak/shared/schemas/reports-ads"

// Step 11.7-r12b admin Ads rules, checked on the shared builder the api and the mock both use.
const period = resolvePeriod(
  { range: "30d", compare: "previous" },
  "2026-11-18"
)
const current = {
  starts: bucketsOf(period.from.slice(0, 10), "2026-11-18", "day"),
}
const compare = {
  starts: bucketsOf(
    period.compareFrom.slice(0, 10),
    period.compareTo.slice(0, 10),
    "day"
  ),
}
const DAY = 86_400_000
const at = (days: number) =>
  new Date(instantOf(period.from) + days * DAY).toISOString()
const zeros = (n: number) => Array.from({ length: n }, () => 0)
const counts = (views: number, clicks: number) => ({
  views: [views, ...zeros(current.starts.length - 1)],
  clicks: [clicks, ...zeros(current.starts.length - 1)],
})
const none = { views: [], clicks: [] }

const campaign = (over: Partial<AdsCampaignInput>): AdsCampaignInput => ({
  id: "camp-1",
  name: "Nile Motors",
  startsAt: at(0),
  endsAt: at(15),
  pages: ["home_top"],
  current: counts(200, 10),
  compare: none,
  ...over,
})
const banner = (over: Partial<AdsBannerInput>): AdsBannerInput => ({
  id: "bn-1",
  name: "Sell your car",
  startsAt: at(-100),
  endsAt: at(100),
  active: true,
  placement: "home_top",
  current: counts(1000, 5),
  compare: none,
  ...over,
})

const build = (input: {
  campaigns?: AdsCampaignInput[]
  banners?: AdsBannerInput[]
}) =>
  adsReportSchema.parse(
    buildAdsReport({
      period,
      campaigns: input.campaigns ?? [],
      banners: input.banners ?? [],
      pages: [
        { id: "home_top", slots: 2, enabled: true },
        { id: "home_middle", slots: 1, enabled: false },
      ],
      current,
      compare,
    })
  )

describe("step 11.7-r12b admin Ads", () => {
  test("slot fill: one campaign 15 of 30 days on a 2-slot page is 25%", () => {
    const r = build({ campaigns: [campaign({})] })
    const page = r.pages.find((p) => p.id === "home_top")
    expect(page).toMatchObject({
      campaigns: 1,
      slotDays: 15,
      fill: { pct: 25 },
    })
    // The page not on sale is left out of the overall fill.
    expect(r.fill.pct).toBe(25)
  })

  test("a campaign outside the period holds no slot and is not listed", () => {
    const r = build({
      campaigns: [
        campaign({ startsAt: at(-20), endsAt: at(-5), current: counts(0, 0) }),
      ],
    })
    expect(r.fill.pct).toBe(0)
    expect(r.ads).toHaveLength(0)
  })

  test("click rate per kind and per bucket; admin banners use no slots", () => {
    const r = build({ campaigns: [campaign({})], banners: [banner({})] })
    expect(r.campaigns.ctr.value).toBe(5)
    expect(r.banners.ctr.value).toBe(0.5)
    expect(r.series[0]).toMatchObject({ campaignCtr: 5, bannerCtr: 0.5 })
    expect(r.series[1]?.campaignCtr).toBeNull()
    expect(r.fill.pct).toBe(25)
    expect(r.ads.map((a) => a.id)).toEqual(["bn-1", "camp-1"])
  })

  test("an inactive banner with no views is not listed", () => {
    const r = build({
      banners: [banner({ active: false, current: counts(0, 0) })],
    })
    expect(r.ads).toHaveLength(0)
  })
})
