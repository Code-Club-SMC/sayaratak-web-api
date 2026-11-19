import type { Listing } from "../schemas/listing"
import type {
  PriceBand,
  PricePosition,
  PriceReport,
  PriceReportQuery,
  PriceReportRow,
} from "../schemas/reports-price"

// Owner, step 11.7-r7: shown from 5 comparables; ±10% is "around"; sold or rented listings count for 90 days.
export const PRICE_MIN_COMPARABLES = 5
export const PRICE_BAND_PCT = 10
export const PRICE_SOLD_DAYS = 90
export const PRICE_REPORT_PAGE_SIZE = 20

const DAY_MS = 86_400_000

// What the API and the mock read per approved listing; the rules below are shared so both answer alike.
export type PriceListing = {
  id: string
  ownerUserId: string
  kind: Listing["kind"]
  intent: Listing["intent"]
  condition: Listing["condition"]
  makeId: string | null
  modelId: string | null
  year: number | null
  rentPeriod: Listing["rentPeriod"]
  price: number
  status: Listing["status"]
  expiresAt: string
  soldAt: string | null
}

export const isLiveAt = (l: PriceListing, now: number) =>
  (l.status === "available" || l.status === "reserved") &&
  Date.parse(l.expiresAt) > now

// Live now, or sold or rented in the last 90 days (its last asking price).
const inPool = (l: PriceListing, now: number) =>
  isLiveAt(l, now) ||
  ((l.status === "sold" || l.status === "rented") &&
    l.soldAt !== null &&
    now - Date.parse(l.soldAt) <= PRICE_SOLD_DAYS * DAY_MS)

// Same make, model, intent and new/used (and rent period for rentals); null when the listing cannot be compared.
const keyOf = (l: PriceListing) =>
  l.kind === "vehicle" &&
  l.makeId &&
  l.modelId &&
  l.year !== null &&
  l.price > 0
    ? [l.intent, l.condition, l.makeId, l.modelId, l.rentPeriod ?? ""].join("|")
    : null

// Linear interpolation between the closest ranks of a sorted list.
export const quantile = (sorted: number[], q: number) => {
  const at = (sorted.length - 1) * q
  const lo = Math.floor(at)
  const a = sorted[lo] ?? 0
  const b = sorted[lo + 1] ?? a
  return Math.round(a + (b - a) * (at - lo))
}

const bandOf = (gap: number): PriceBand =>
  gap < -PRICE_BAND_PCT ? "below" : gap > PRICE_BAND_PCT ? "above" : "around"

const none = (state: "few" | "none", comparables = 0): PricePosition => ({
  state,
  comparables,
  median: null,
  low: null,
  high: null,
  gapPct: null,
  band: null,
})

/** The market pool grouped by comparison key, so many listings can be placed in one pass. */
export function poolOf(market: PriceListing[], now: number) {
  const groups = new Map<string, PriceListing[]>()
  for (const l of market) {
    const key = keyOf(l)
    if (!key || !inPool(l, now)) continue
    const group = groups.get(key)
    if (group) group.push(l)
    else groups.set(key, [l])
  }
  return groups
}

/** Where one listing's price sits against the same car (year ±1) in the pool, the listing itself left out. */
export function pricePositionOf(
  target: PriceListing,
  pool: Map<string, PriceListing[]>
): PricePosition {
  const key = keyOf(target)
  if (!key || target.year === null) return none("none")
  const year = target.year
  const prices = (pool.get(key) ?? [])
    .filter((l) => l.id !== target.id && Math.abs((l.year ?? 0) - year) <= 1)
    .map((l) => l.price)
    .sort((a, b) => a - b)
  if (prices.length < PRICE_MIN_COMPARABLES) return none("few", prices.length)
  const median = quantile(prices, 0.5)
  const gapPct = Math.round(((target.price - median) / median) * 100)
  return {
    state: "ok",
    comparables: prices.length,
    median,
    low: quantile(prices, 0.25),
    high: quantile(prices, 0.75),
    gapPct,
    band: bandOf(gapPct),
  }
}

type Card = { slug: string; title: string; coverUrl: string | null }

/** The Price tab of one account: its live listings placed against the market, most over the middle first. */
export function buildPriceReport(input: {
  userId: string
  market: PriceListing[]
  cards: Map<string, Card>
  query: PriceReportQuery
  now: number
}): PriceReport {
  const { query, now } = input
  const pool = poolOf(input.market, now)
  const rows: PriceReportRow[] = input.market
    .filter((l) => l.ownerUserId === input.userId && isLiveAt(l, now))
    .map((l) => {
      const card = input.cards.get(l.id)
      return {
        id: l.id,
        slug: card?.slug ?? "",
        title: card?.title ?? "",
        coverUrl: card?.coverUrl ?? null,
        price: l.price,
        intent: l.intent,
        rentPeriod: l.intent === "rent" ? l.rentPeriod : null,
        position: pricePositionOf(l, pool),
      }
    })
    // Biggest gap first, rows without a band last; ties keep id order so the API and the mock page alike.
    .sort(
      (a, b) =>
        (b.position.gapPct ?? -Infinity) - (a.position.gapPct ?? -Infinity) ||
        (a.id < b.id ? -1 : 1)
    )
  const summary = {
    live: rows.length,
    below: 0,
    around: 0,
    above: 0,
    unknown: 0,
  }
  for (const r of rows) summary[r.position.band ?? "unknown"] += 1
  const kept = rows.filter((r) =>
    query.band === "all" ? true : (r.position.band ?? "unknown") === query.band
  )
  const size = PRICE_REPORT_PAGE_SIZE
  return {
    summary,
    rows: {
      items: kept.slice((query.page - 1) * size, query.page * size),
      total: kept.length,
      page: query.page,
      pageSize: size,
    },
  }
}
