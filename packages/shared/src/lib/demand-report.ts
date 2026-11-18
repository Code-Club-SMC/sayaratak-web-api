import type { Period } from "../schemas/period"
import type { DemandMake, DemandReport } from "../schemas/reports-demand"

// Owner, step 11.7-r6: makes and models with fewer market listings fold into "Other"; a city with fewer live listings reads all Sudan.
export const DEMAND_MIN_LISTINGS = 5
export const DEMAND_MIN_CITY_LIVE = 50

// A market listing (approved vehicle with a make) and its views in the period.
export type DemandListing = {
  makeId: string
  modelId: string | null
  views: number
}
// One of the account's live vehicle listings with a make.
export type DemandStock = { makeId: string; modelId: string | null }

/** Whether the account's city has enough live vehicle listings to stand alone. */
export const demandScopeOf = (cityId: string | null, liveInCity: number) =>
  cityId && liveInCity >= DEMAND_MIN_CITY_LIVE ? "city" : "country"

const share = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 100) : 0

const tally = <T>(items: T[], key: (item: T) => string | null) => {
  const counts = new Map<string | null, number>()
  for (const item of items) {
    const k = key(item)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return counts
}

// Views and stock per group; groups with neither are dropped. Bigger views first, "Other" last, ties by id.
function groupsOf(input: {
  market: DemandListing[]
  stock: DemandStock[]
  key: (item: DemandListing | DemandStock) => string | null
  totalViews: number
  totalStock: number
}) {
  const ids = new Set<string | null>()
  const views = new Map<string | null, number>()
  for (const l of input.market) {
    const k = input.key(l)
    ids.add(k)
    views.set(k, (views.get(k) ?? 0) + l.views)
  }
  const stock = tally(input.stock, input.key)
  for (const k of stock.keys()) ids.add(k)
  return [...ids]
    .map((id) => {
      const v = views.get(id) ?? 0
      const s = stock.get(id) ?? 0
      return {
        id,
        views: v,
        viewShare: share(v, input.totalViews),
        stock: s,
        stockShare: share(s, input.totalStock),
      }
    })
    .filter((g) => g.views > 0 || g.stock > 0)
    .sort((a, b) =>
      a.id === null || b.id === null
        ? Number(a.id === null) - Number(b.id === null)
        : b.views - a.views || b.stock - a.stock || (a.id < b.id ? -1 : 1)
    )
}

/** The Demand report: share of market views per make (and model) against share of the account's live stock. */
export function buildDemandReport(input: {
  period: Period
  scope: "city" | "country"
  cityId: string | null
  market: DemandListing[]
  stock: DemandStock[]
}): DemandReport {
  const { market, stock } = input
  const totalViews = market.reduce((a, l) => a + l.views, 0)
  const totalStock = stock.length
  const perMake = tally(market, (l) => l.makeId)
  const makeOf = (l: DemandStock) =>
    (perMake.get(l.makeId) ?? 0) >= DEMAND_MIN_LISTINGS ? l.makeId : null
  const makes: DemandMake[] = groupsOf({
    market,
    stock,
    key: makeOf,
    totalViews,
    totalStock,
  }).map(({ id, ...g }) => {
    if (id === null) return { makeId: null, ...g, models: [] }
    const inMake = <T extends DemandStock>(items: T[]) =>
      items.filter((l) => makeOf(l) === id)
    const m = inMake(market)
    const perModel = tally(m, (l) => l.modelId)
    const models = groupsOf({
      market: m,
      stock: inMake(stock),
      key: (l) =>
        l.modelId && (perModel.get(l.modelId) ?? 0) >= DEMAND_MIN_LISTINGS
          ? l.modelId
          : null,
      totalViews,
      totalStock,
    }).map(({ id: modelId, ...rest }) => ({ modelId, ...rest }))
    return { makeId: id, ...g, models }
  })
  return {
    period: input.period,
    scope: input.scope,
    cityId: input.scope === "city" ? input.cityId : null,
    totalViews,
    totalStock,
    makes,
  }
}
