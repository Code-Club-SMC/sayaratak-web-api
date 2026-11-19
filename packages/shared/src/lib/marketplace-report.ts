import type { Listing } from "../schemas/listing"
import { intentSchema, vehicleTypeSchema } from "../schemas/listing"
import type { Period } from "../schemas/period"
import {
  type LifecycleState,
  lifecycleStateSchema,
  type MarketplaceReport,
} from "../schemas/reports-insights"
import { daysToSell, median } from "./listings-report"
import {
  addMinutesDays,
  alignStarts,
  alignTo,
  type Buckets,
  instantOf,
  minuteOf,
  sumTimed,
  within,
} from "./period"
import {
  isLiveAt,
  PRICE_MIN_COMPARABLES,
  type PriceListing,
  poolOf,
  quantile,
} from "./price-position"

// Owner, step 11.7-r10: a listing counts as contacted when a call, WhatsApp or message came in its first 7 days.
const CONTACT_DAYS = 7
const PRICE_ROWS = 50
const HOUR_MS = 3_600_000

// What the API and the mock read per listing that left draft; the rules below are shared so both answer alike.
export type MarketInput = PriceListing & {
  vehicleType: Listing["vehicleType"]
  cityId: string
  moderation: Exclude<Listing["moderation"], "draft">
  createdAt: string
  decidedAt: string | null
  // Khartoum day of the first call, WhatsApp click or message from someone else; null when none.
  firstContactDay: string | null
}

// Public at the admin decision, else at creation (auto-approved).
const liveAt = (l: MarketInput) => l.decidedAt ?? l.createdAt

function stateOf(l: MarketInput, now: number): LifecycleState {
  if (l.moderation !== "approved") return l.moderation
  if (l.status === "sold" || l.status === "rented") return "sold"
  return isLiveAt(l, now) ? "live" : "expired"
}

// Whole % of the listings that went live in [from, to) and were contacted in their first 7 days.
function contactedOf(
  rows: MarketInput[],
  from: string,
  to: string,
  now: number
) {
  let yes = 0
  let base = 0
  for (const l of rows) {
    if (!within(liveAt(l), from, to)) continue
    const deadline = addMinutesDays(minuteOf(liveAt(l)), CONTACT_DAYS)
    const hit =
      l.firstContactDay !== null && l.firstContactDay <= deadline.slice(0, 10)
    // Still inside its first 7 days with no contact: not decided yet.
    if (!hit && now < instantOf(deadline)) continue
    base++
    if (hit) yes++
  }
  return { rate: base ? Math.round((yes * 100) / base) : null, base }
}

// Median whole hours from creation to an approve or reject decision made in [from, to).
function decisionHoursOf(rows: MarketInput[], from: string, to: string) {
  const m = median(
    rows.flatMap((l) =>
      (l.moderation === "approved" || l.moderation === "rejected") &&
      l.decidedAt &&
      within(l.decidedAt, from, to)
        ? [(Date.parse(l.decidedAt) - Date.parse(l.createdAt)) / HOUR_MS]
        : []
    )
  )
  return m === null ? null : Math.round(m)
}

function seriesOf(
  rows: MarketInput[],
  b: Buckets,
  period: [string, string],
  length: number
) {
  const [from, to] = period
  const created = alignTo(
    sumTimed(
      b,
      rows.flatMap((l) =>
        within(l.createdAt, from, to) ? [[l.createdAt, 1]] : []
      )
    ),
    length
  )
  const sold = alignTo(
    sumTimed(
      b,
      rows.flatMap((l) =>
        l.soldAt && within(l.soldAt, from, to) ? [[l.soldAt, 1]] : []
      )
    ),
    length
  )
  return alignStarts(b.starts, length).map((date, i) => ({
    date,
    created: created[i] ?? 0,
    sold: sold[i] ?? 0,
  }))
}

// Typical price per sale make, model and new/used over the price-position pool (live now or sold in the last 90 days).
function pricesOf(rows: MarketInput[], now: number) {
  const groups = new Map<string, number[]>()
  for (const group of poolOf(rows, now).values())
    for (const l of group) {
      if (l.intent !== "sale" || !l.makeId || !l.modelId) continue
      const key = [l.makeId, l.modelId, l.condition].join("|")
      groups.set(key, [...(groups.get(key) ?? []), l.price])
    }
  return [...groups]
    .filter(([, prices]) => prices.length >= PRICE_MIN_COMPARABLES)
    .map(([key, prices]) => {
      const [makeId = "", modelId = "", condition] = key.split("|")
      const sorted = prices.sort((a, b) => a - b)
      return {
        makeId,
        modelId,
        condition: condition === "new" ? ("new" as const) : ("used" as const),
        count: sorted.length,
        median: quantile(sorted, 0.5),
        low: quantile(sorted, 0.25),
        high: quantile(sorted, 0.75),
      }
    })
    .sort((a, b) => b.count - a.count || key(a).localeCompare(key(b)))
    .slice(0, PRICE_ROWS)
}
const key = (r: { makeId: string; modelId: string; condition: string }) =>
  `${r.makeId}|${r.modelId}|${r.condition}`

/** The admin Marketplace tab from every listing that left draft, at `now`. */
export function buildMarketplaceReport(input: {
  period: Period
  listings: MarketInput[]
  current: Buckets
  compare: Buckets
  now: number
}): MarketplaceReport {
  const { period, listings, current, compare, now } = input
  const { from, to, compareFrom, compareTo } = period
  const approved = listings.filter((l) => l.moderation === "approved")
  const live = approved.filter((l) => isLiveAt(l, now))
  const created = listings.filter((l) => within(l.createdAt, from, to))
  const createdIn = (a: string, b: string) =>
    listings.filter((l) => within(l.createdAt, a, b)).length
  const soldIn = (a: string, b: string) =>
    approved.filter((l) => l.soldAt && within(l.soldAt, a, b)).length
  const sellRows = approved.map((l) => ({
    soldAt: l.soldAt,
    liveSince: liveAt(l),
  }))
  const contacted = contactedOf(approved, from, to, now)
  const length = current.starts.length
  const share = <K extends string>(
    keys: readonly K[],
    keyOf: (l: MarketInput) => K
  ) =>
    keys.map((k) => ({
      key: k,
      live: live.filter((l) => keyOf(l) === k).length,
      created: created.filter((l) => keyOf(l) === k).length,
    }))
  const cities = [...new Set([...live, ...created].map((l) => l.cityId))].sort()
  return {
    period,
    liveNow: live.length,
    created: {
      count: created.length,
      previous: createdIn(compareFrom, compareTo),
    },
    sold: { count: soldIn(from, to), previous: soldIn(compareFrom, compareTo) },
    contacted: {
      ...contacted,
      previous: contactedOf(approved, compareFrom, compareTo, now).rate,
    },
    daysToSell: {
      median: daysToSell(sellRows, from, to).median,
      previous: daysToSell(sellRows, compareFrom, compareTo).median,
    },
    decisionHours: {
      median: decisionHoursOf(listings, from, to),
      previous: decisionHoursOf(listings, compareFrom, compareTo),
    },
    lifecycle: lifecycleStateSchema.options.map((state) => ({
      state,
      count: created.filter((l) => stateOf(l, now) === state).length,
    })),
    series: seriesOf(listings, current, [from, to], length),
    previousSeries: seriesOf(
      listings,
      compare,
      [compareFrom, compareTo],
      length
    ),
    byType: share([...vehicleTypeSchema.options, "part"] as const, (l) =>
      l.kind === "part" ? "part" : (l.vehicleType ?? "car")
    ),
    byIntent: share(intentSchema.options, (l) => l.intent),
    byCity: share(cities, (l) => l.cityId).sort(
      (a, b) => b.live - a.live || b.created - a.created
    ),
    prices: pricesOf(approved, now),
  }
}
