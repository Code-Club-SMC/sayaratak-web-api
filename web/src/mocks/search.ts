import type { SearchParams } from "@/features/search/schemas"
import { db } from "./db"
import type { ListingRow } from "./types"

type Skip = "type" | "make" | "fuel" | "transmission" | "city"
const skips: Record<Skip, string[]> = {
  type: ["type"],
  make: ["make", "model"],
  fuel: ["fuel"],
  transmission: ["transmission"],
  city: ["city", "district"],
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const rad = (d: number) => (d * Math.PI) / 180
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) *
      Math.cos(rad(b.lat)) *
      Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

const names = (id: string | null) => {
  const m =
    db.taxonomy.makes.find((x) => x.id === id) ??
    db.taxonomy.models.find((x) => x.id === id)
  return m ? `${m.name.ar} ${m.name.en}` : ""
}
const text = (l: ListingRow) =>
  `${l.title} ${l.description} ${names(l.makeId)} ${names(l.modelId)}`.toLowerCase()

export function matches(l: ListingRow, p: SearchParams, skip: string[] = []) {
  const on = (key: string) => !skip.includes(key)
  if (l.moderation !== "approved" || l.kind !== p.kind) return false
  if (!p.includeSold && (l.status === "sold" || l.status === "rented"))
    return false
  if (p.intent && l.intent !== p.intent) return false
  if (on("type") && p.type && l.vehicleType !== p.type) return false
  if (on("city") && p.city && l.cityId !== p.city) return false
  if (on("district") && p.district && l.districtId !== p.district) return false
  if (on("make") && p.make && l.makeId !== p.make) return false
  if (on("model") && p.model && l.modelId !== p.model) return false
  if (p.minPrice !== undefined && l.price < p.minPrice) return false
  if (p.maxPrice !== undefined && l.price > p.maxPrice) return false
  if (p.minYear !== undefined && (l.year ?? 0) < p.minYear) return false
  if (p.maxYear !== undefined && (l.year ?? 9999) > p.maxYear) return false
  if (p.maxMileage !== undefined && (l.mileageKm ?? 0) > p.maxMileage)
    return false
  if (on("fuel") && p.fuel?.length && (!l.fuel || !p.fuel.includes(l.fuel)))
    return false
  if (
    on("transmission") &&
    p.transmission?.length &&
    (!l.transmission || !p.transmission.includes(l.transmission))
  )
    return false
  if (p.condition && l.condition !== p.condition) return false
  if (p.partCategory && l.partCategoryId !== p.partCategory) return false
  if (p.verifiedOnly && !l.owner.verified) return false
  if (p.hasVideo && !l.media.some((m) => m.type === "video")) return false
  if (p.seller && l.owner.id !== p.seller && l.ownerUserId !== p.seller)
    return false
  if (p.q) {
    const hay = text(l)
    if (
      !p.q
        .toLowerCase()
        .split(/\s+/)
        .every((word) => hay.includes(word))
    )
      return false
  }
  if (p.radius && p.lat !== undefined && p.lng !== undefined) {
    if (
      !l.location ||
      haversineKm({ lat: p.lat, lng: p.lng }, l.location) > p.radius
    )
      return false
  }
  return true
}

const tiers = { sponsored: 3, pin: 2, boost: 1, homepage: 0 } as const
export const tierOf = (l: ListingRow, now = Date.now()) =>
  Math.max(
    0,
    ...l.promotions
      .filter(
        (x) => Date.parse(x.startsAt) <= now && Date.parse(x.endsAt) >= now
      )
      .map((x) => tiers[x.type])
  )
const newest = (a: ListingRow, b: ListingRow) =>
  b.createdAt.localeCompare(a.createdAt)

// A4 ranking: paid tier first, then listings with photos, then newest.
const ranked = (a: ListingRow, b: ListingRow) =>
  tierOf(b) - tierOf(a) ||
  Number(b.media.length > 0) - Number(a.media.length > 0) ||
  newest(a, b)

export function sortListings(rows: ListingRow[], p: SearchParams) {
  const origin =
    p.lat !== undefined && p.lng !== undefined
      ? { lat: p.lat, lng: p.lng }
      : null
  const km = (l: ListingRow) =>
    origin && l.location ? haversineKm(origin, l.location) : Infinity
  const sorts: Record<
    SearchParams["sort"],
    (a: ListingRow, b: ListingRow) => number
  > = {
    relevance: ranked,
    newest,
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    year_desc: (a, b) => (b.year ?? 0) - (a.year ?? 0),
    mileage_asc: (a, b) => (a.mileageKm ?? 0) - (b.mileageKm ?? 0),
    nearest: origin ? (a, b) => km(a) - km(b) : ranked,
  }
  return [...rows].sort(sorts[p.sort])
}

const countBy = (
  rows: ListingRow[],
  value: (l: ListingRow) => string | null
) => {
  const counts = new Map<string, number>()
  for (const l of rows) {
    const v = value(l)
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1)
  }
  return [...counts]
    .map(([v, count]) => ({ value: v, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

// Counts per facet value are computed without that facet's own filter.
export function facets(p: SearchParams) {
  const rows = (key: Skip) =>
    db.listings.filter((l) => matches(l, p, skips[key]))
  return {
    type: countBy(rows("type"), (l) => l.vehicleType),
    make: countBy(rows("make"), (l) => l.makeId),
    fuel: countBy(rows("fuel"), (l) => l.fuel),
    transmission: countBy(rows("transmission"), (l) => l.transmission),
    city: countBy(rows("city"), (l) => l.cityId),
  }
}
