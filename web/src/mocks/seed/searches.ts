import { addDays, minuteOf } from "@sayaratak/shared/lib/period"
import type { Taxonomy } from "@sayaratak/shared/schemas/taxonomy"

import type { ListingRow, SearchRow } from "../types"

const DAYS = 90

// FNV-1a: a fixed number per text, so the seed draws nothing from faker and the rest of the seed stays the same.
const hash = (text: string) => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++)
    h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return h >>> 0
}

type Filters = Omit<SearchRow, "day" | "searches" | "zeroResults" | "results">
const blank: Filters = {
  kind: "vehicle",
  intent: "",
  type: "",
  make: "",
  model: "",
  city: "",
  partCategory: "",
  hasText: false,
}

/** Step 11.7-r13 (owner): 90 days of page-1 searches, drawn from fixed hashes. Makes with more listings are searched more; a set's result count is the live listings it matches today, so sets with no stock show as misses. */
export function seedSearches(
  taxonomy: Taxonomy,
  listings: ListingRow[],
  now: number
): SearchRow[] {
  const today = minuteOf(new Date(now).toISOString()).slice(0, 10)
  const live = listings.filter(
    (l) => l.moderation === "approved" && l.status === "available"
  )
  const matches = (f: Filters) =>
    live.filter(
      (l) =>
        l.kind === f.kind &&
        (!f.intent || l.intent === f.intent) &&
        (!f.make || l.makeId === f.make) &&
        (!f.model || l.modelId === f.model) &&
        (!f.city || l.cityId === f.city) &&
        (!f.partCategory || l.partCategoryId === f.partCategory)
    ).length
  const cities = taxonomy.cities.slice(0, 4).map((c) => c.id)
  const makes = taxonomy.makes.slice(0, 12)
  // [filters, searches on a usual day]
  const sets: [Filters, number][] = [[blank, 60]]
  makes.forEach((m, i) => {
    const weight = Math.max(2, 24 - i * 2)
    sets.push([{ ...blank, make: m.id }, weight])
    const models = taxonomy.models.filter((x) => x.makeId === m.id).slice(0, 2)
    for (const x of models) {
      sets.push([{ ...blank, make: m.id, model: x.id }, weight / 2])
      for (const city of cities)
        sets.push([
          { ...blank, make: m.id, model: x.id, city, intent: "sale" },
          weight / 6,
        ])
    }
  })
  for (const city of cities) sets.push([{ ...blank, city }, 10])
  for (const p of taxonomy.partCategories.slice(0, 6))
    for (const city of cities.slice(0, 2))
      sets.push([{ ...blank, kind: "part", partCategory: p.id, city }, 3])
  const rows: SearchRow[] = []
  for (const [f, usual] of sets) {
    const key = Object.values(f).join("|")
    const found = matches(f)
    const text = hash(key) % 6 === 0
    for (let d = DAYS - 1; d >= 0; d--) {
      const day = addDays(today, -d)
      // Friday is quieter.
      const friday = new Date(`${day}T12:00:00Z`).getUTCDay() === 5
      const spread = 0.5 + (hash(`${key}|${day}`) % 100) / 100
      const searches = Math.floor(usual * spread * (friday ? 0.6 : 1))
      if (!searches) continue
      rows.push({
        day,
        ...f,
        hasText: text,
        searches,
        zeroResults: found ? 0 : searches,
        results: found * searches,
      })
    }
  }
  return rows
}
