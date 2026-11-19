import { describe, expect, test } from "vitest"

import { resolvePeriod } from "@sayaratak/shared/lib/period"
import {
  buildSearchReport,
  type SearchDayInput,
  type SearchListingInput,
} from "@sayaratak/shared/lib/search-report"
import { searchReportSchema } from "@sayaratak/shared/schemas/reports-search"

// Step 11.7-r13 admin Search demand rules, checked on the shared builder the api and the mock both use.
const period = resolvePeriod(
  { range: "30d", compare: "previous" },
  "2026-11-18"
)
const now = Date.parse("2026-11-18T12:00:00+02:00")
const row = (over: Partial<SearchDayInput>): SearchDayInput => ({
  day: "2026-11-10",
  kind: "vehicle",
  intent: "",
  type: "",
  make: "",
  model: "",
  city: "",
  partCategory: "",
  hasText: false,
  searches: 1,
  zeroResults: 0,
  ...over,
})
const live = (makeId: string, over: Partial<SearchListingInput> = {}) => ({
  kind: "vehicle" as const,
  makeId,
  status: "available" as const,
  expiresAt: "2027-01-01T00:00:00Z",
  moderation: "approved",
  ...over,
})
const build = (rows: SearchDayInput[], listings: SearchListingInput[] = []) =>
  searchReportSchema.parse(buildSearchReport({ period, rows, listings, now }))

describe("buildSearchReport", () => {
  test("counts searches, misses and typed words per window", () => {
    const r = build([
      row({ searches: 8, zeroResults: 2, hasText: true }),
      row({ searches: 2 }),
      row({
        day: period.compareFrom.slice(0, 10),
        searches: 5,
        zeroResults: 5,
      }),
      row({ day: "2025-01-01", searches: 99 }),
    ])
    expect(r.searches).toEqual({ count: 10, previous: 5 })
    expect(r.misses).toEqual({ count: 2, previous: 5 })
    expect(r.missRate).toEqual({ value: 20, previous: 100 })
    expect(r.textRate.value).toBe(80)
    expect(r.series.reduce((a, p) => a + p.searches, 0)).toBe(10)
    expect(r.series).toHaveLength(r.previousSeries.length)
  })

  test("searches per listing per make, owner example: 380 / 110 = 3.5, site 1,000 / 500 = 2.0", () => {
    const listings = [
      ...Array.from({ length: 110 }, () => live("toyota")),
      ...Array.from({ length: 390 }, () => live("kia")),
      live("kia", { status: "sold" }),
      live("kia", { moderation: "pending" }),
      live("kia", { expiresAt: "2026-01-01T00:00:00Z" }),
    ]
    const r = build(
      [
        row({ make: "toyota", searches: 380 }),
        row({ make: "kia", searches: 600 }),
        row({ make: "hyundai", searches: 20, zeroResults: 20 }),
        row({ searches: 50 }),
      ],
      listings
    )
    expect(r.perListing).toBe(2)
    const toyota = r.makes.find((m) => m.id === "toyota")
    expect(toyota).toMatchObject({ searches: 380, live: 110, perListing: 3.5 })
    expect(r.makes.find((m) => m.id === "hyundai")?.perListing).toBeNull()
    expect(r.makes.map((m) => m.id)).toEqual(["kia", "toyota", "hyundai"])
  })

  test("missed filter sets group the whole set, most misses first, with all its searches", () => {
    const sonata = { make: "hyundai", model: "sonata", city: "port-sudan" }
    const r = build([
      row({ ...sonata, day: "2026-11-09", searches: 6, zeroResults: 6 }),
      row({ ...sonata, day: "2026-11-10", searches: 4, zeroResults: 0 }),
      row({ make: "kia", searches: 3, zeroResults: 3 }),
      row({ make: "toyota", searches: 9 }),
    ])
    expect(r.missed).toHaveLength(2)
    expect(r.missed[0]).toMatchObject({ ...sonata, searches: 10, misses: 6 })
    expect(r.models[0]).toMatchObject({ id: "sonata", makeId: "hyundai" })
  })

  test("hour periods chart per day", () => {
    const hourly = resolvePeriod(
      {
        range: "30d",
        from: "2026-11-17T08:00",
        to: "2026-11-18T08:00",
        compare: "previous",
      },
      "2026-11-18"
    )
    const r = buildSearchReport({
      period: hourly,
      rows: [row({ day: "2026-11-17", searches: 3 })],
      listings: [],
      now,
    })
    expect(hourly.granularity).toBe("hour")
    expect(r.seriesGranularity).toBe("day")
    expect(r.series.map((p) => p.date)).toEqual(["2026-11-17", "2026-11-18"])
    expect(r.searches.count).toBe(3)
  })
})
