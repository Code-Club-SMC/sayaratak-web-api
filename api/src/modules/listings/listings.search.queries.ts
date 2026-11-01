import type { SearchParams } from "@sayaratak/shared/search/schemas"
import {
  and,
  asc,
  count,
  desc,
  inArray,
  isNotNull,
  ne,
  type SQL,
  sql,
} from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import {
  distanceKm,
  type FacetKey,
  hasMedia,
  type SearchScope,
  searchWhere,
} from "./listings.filters.queries"
import { listings } from "./listings.tables"

const FACET_COLUMNS = {
  type: listings.vehicleType,
  make: listings.makeId,
  fuel: listings.fuel,
  transmission: listings.transmission,
  city: listings.cityId,
}
// A bump puts a listing back at the top as if it had just been posted.
const posted = sql`coalesce(${listings.bumpedAt}, ${listings.createdAt})`

/**
 * One page of a public search with the total. Ties keep id order, which is
 * the mock's array order for the seed (a stable JS sort).
 */
export async function listSearchPage(
  ex: Executor,
  search: {
    params: SearchParams
    scope: SearchScope
    exclude?: string
    page: { offset: number; size: number }
  }
) {
  const { params, scope } = search
  const where = and(
    searchWhere(params, scope),
    search.exclude ? ne(listings.id, search.exclude) : undefined
  )
  const rows = await ex
    .select({
      listing: listings,
      total: sql<number>`count(*) over ()`.mapWith(Number),
    })
    .from(listings)
    .where(where)
    .orderBy(...orderOf(params, scope), asc(listings.id))
    .offset(search.page.offset)
    .limit(search.page.size)
  const total = rows[0]?.total ?? (await ex.$count(listings, where))
  return { rows: rows.map((row) => row.listing), total }
}

/** Counts per value of one facet, with that facet's own filter left out (disjunctive). */
export async function countFacet(
  ex: Executor,
  facet: { params: SearchParams; scope: SearchScope; key: FacetKey }
) {
  const where = searchWhere(facet.params, facet.scope, facet.key)
  if (facet.key === "type" && facet.params.kind === "part")
    return countFits(ex, where)
  const value = FACET_COLUMNS[facet.key]
  return ex
    .select({ value: sql<string>`${value}`, count: count() })
    .from(listings)
    .where(and(where, isNotNull(value)))
    .groupBy(value)
}

// A part counts once for each type it fits. Counted here, not in SQL:
// unnest cannot sit in a WHERE, and parts fit at most five types.
async function countFits(ex: Executor, where: SQL | undefined) {
  const rows = await ex
    .select({ types: listings.compatibleTypes })
    .from(listings)
    .where(where)
  const counts = new Map<string, number>()
  for (const type of rows.flatMap((row) => row.types))
    counts.set(type, (counts.get(type) ?? 0) + 1)
  return [...counts].map(([value, total]) => ({ value, count: total }))
}

// Mock `sortListings`. Relevance: Featured now, then with photos, then newest
// (4.6 adds the Featured interleave). Nearest without a point is relevance.
function orderOf(params: SearchParams, scope: SearchScope): SQL[] {
  const origin =
    params.lat !== undefined && params.lng !== undefined
      ? { lat: params.lat, lng: params.lng }
      : null
  const relevance = [
    desc(inArray(listings.id, [...scope.featuredIds, ""])),
    desc(hasMedia()),
    desc(posted),
  ]
  const orders: Record<SearchParams["sort"], SQL[]> = {
    relevance,
    newest: [desc(posted)],
    price_asc: [asc(listings.price)],
    price_desc: [desc(listings.price)],
    year_desc: [sql`coalesce(${listings.year}, 0) desc`],
    mileage_asc: [sql`coalesce(${listings.mileageKm}, 0) asc`],
    nearest: origin ? [sql`${distanceKm(origin)} asc nulls last`] : relevance,
  }
  return orders[params.sort]
}
