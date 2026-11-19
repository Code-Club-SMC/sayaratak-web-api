import type { AdPageId } from "../schemas/ads"
import type { Period } from "../schemas/period"
import type {
  AdRow,
  AdsPoint,
  AdsReport,
  PageFill,
} from "../schemas/reports-ads"
import { alignStarts, alignTo, instantOf } from "./period"

// What the API and the mock read for the admin Ads tab (step 11.7-r12b). `current` and `compare` are banner views and clicks per bucket of each window.
type Counts = { views: number[]; clicks: number[] }
type AdBase = {
  id: string
  name: string
  startsAt: string
  endsAt: string
  current: Counts
  compare: Counts
}
// Approved campaigns only: they alone hold a slot.
export type AdsCampaignInput = AdBase & { pages: AdPageId[] }
export type AdsBannerInput = AdBase & {
  active: boolean
  placement: Extract<AdRow, { kind: "banner" }>["placement"]
}
export type AdsPageInput = { id: AdPageId; slots: number; enabled: boolean }

const DAY_MS = 86_400_000
type Window = { from: number; to: number }

const total = (values: number[]) => values.reduce((a, b) => a + b, 0)
const ctrOf = (views: number, clicks: number) =>
  views ? Math.round((clicks / views) * 1000) / 10 : null
const pct = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : null
const round1 = (n: number) => Math.round(n * 10) / 10

// Days of [startsAt, endsAt) inside the window.
const heldDays = (ad: AdBase, w: Window) =>
  Math.max(
    0,
    (Math.min(Date.parse(ad.endsAt), w.to) -
      Math.max(Date.parse(ad.startsAt), w.from)) /
      DAY_MS
  )

function totalsOf(ads: AdBase[]) {
  const sum = (pick: (a: AdBase) => number[]) =>
    total(ads.map((a) => total(pick(a))))
  const views = sum((a) => a.current.views)
  const clicks = sum((a) => a.current.clicks)
  const pv = sum((a) => a.compare.views)
  const pc = sum((a) => a.compare.clicks)
  return {
    views: { count: views, previous: pv },
    clicks: { count: clicks, previous: pc },
    ctr: { value: ctrOf(views, clicks), previous: ctrOf(pv, pc) },
  }
}

function seriesOf(
  starts: string[],
  length: number,
  campaigns: AdBase[],
  banners: AdBase[],
  pick: (a: AdBase) => Counts
): AdsPoint[] {
  const per = (ads: AdBase[], key: keyof Counts) =>
    alignTo(
      starts.map((_, i) => total(ads.map((a) => pick(a)[key][i] ?? 0))),
      length
    )
  const cv = per(campaigns, "views")
  const cc = per(campaigns, "clicks")
  const bv = per(banners, "views")
  const bc = per(banners, "clicks")
  return alignStarts(starts, length).map((date, i) => {
    const point = {
      campaignViews: cv[i] ?? 0,
      campaignClicks: cc[i] ?? 0,
      bannerViews: bv[i] ?? 0,
      bannerClicks: bc[i] ?? 0,
    }
    return {
      date,
      ...point,
      campaignCtr: ctrOf(point.campaignViews, point.campaignClicks),
      bannerCtr: ctrOf(point.bannerViews, point.bannerClicks),
    }
  })
}

/** The admin Ads tab: campaign and banner views, clicks and click rate per bucket, slot fill per page and every ad of the period. */
export function buildAdsReport(input: {
  period: Period
  campaigns: AdsCampaignInput[]
  banners: AdsBannerInput[]
  pages: AdsPageInput[]
  current: { starts: string[] }
  compare: { starts: string[] }
}): AdsReport {
  const { period, campaigns, banners, pages } = input
  const w = { from: instantOf(period.from), to: instantOf(period.to) }
  const prev = {
    from: instantOf(period.compareFrom),
    to: instantOf(period.compareTo),
  }
  const days = (x: Window) => (x.to - x.from) / DAY_MS
  const seen = (a: AdBase) =>
    total(a.current.views) + total(a.current.clicks) > 0
  const length = input.current.starts.length
  const held = (id: AdPageId, x: Window) =>
    campaigns
      .filter((c) => c.pages.includes(id))
      .map((c) => heldDays(c, x))
      .filter((d) => d > 0)
  const fills: PageFill[] = pages.map((p) => {
    const now = held(p.id, w)
    const before = held(p.id, prev)
    return {
      id: p.id,
      slots: p.slots,
      enabled: p.enabled,
      campaigns: now.length,
      slotDays: round1(total(now)),
      fill: {
        pct: pct(total(now), p.slots * days(w)),
        previous: pct(total(before), p.slots * days(prev)),
      },
    }
  })
  const onSale = pages.filter((p) => p.enabled)
  const sumHeld = (x: Window) => total(onSale.map((p) => total(held(p.id, x))))
  const capacity = (x: Window) => total(onSale.map((p) => p.slots)) * days(x)
  const row = (a: AdBase) => {
    const views = total(a.current.views)
    const clicks = total(a.current.clicks)
    return {
      id: a.id,
      name: a.name,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      views,
      clicks,
      ctr: ctrOf(views, clicks),
    }
  }
  const ads: AdRow[] = [
    ...campaigns
      .filter((c) => heldDays(c, w) > 0 || seen(c))
      .map((c) => ({ ...row(c), kind: "campaign" as const, pages: c.pages })),
    ...banners
      .filter((b) => (b.active && heldDays(b, w) > 0) || seen(b))
      .map((b) => ({
        ...row(b),
        kind: "banner" as const,
        placement: b.placement,
      })),
  ].sort((a, b) => b.views - a.views || (a.id < b.id ? -1 : 1))
  return {
    period,
    campaigns: totalsOf(campaigns),
    banners: totalsOf(banners),
    fill: {
      pct: pct(sumHeld(w), capacity(w)),
      previous: pct(sumHeld(prev), capacity(prev)),
    },
    series: seriesOf(
      input.current.starts,
      length,
      campaigns,
      banners,
      (a) => a.current
    ),
    previousSeries: seriesOf(
      input.compare.starts,
      length,
      campaigns,
      banners,
      (a) => a.compare
    ),
    pages: fills,
    ads,
  }
}
