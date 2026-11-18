import { describe, expect, test } from "vitest"

import {
  buildPriceReport,
  type PriceListing,
  poolOf,
  pricePositionOf,
} from "@sayaratak/shared/lib/price-position"
import {
  pricePositionSchema,
  priceReportQuerySchema,
  priceReportSchema,
} from "@sayaratak/shared/schemas/reports-price"
import { buildSeed } from "@/mocks/seed"

// Step 11.7-r7 price position rules (owner 2026-11-18), checked on the shared builder the api and the mock both use.
const NOW = Date.parse("2026-11-18T10:00:00Z")
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString()

let n = 0
const car = (over: Partial<PriceListing> = {}): PriceListing => ({
  id: `l${++n}`,
  ownerUserId: "u-other",
  kind: "vehicle",
  intent: "sale",
  condition: "used",
  makeId: "toyota",
  modelId: "toyota-corolla",
  year: 2015,
  rentPeriod: null,
  price: 10_000_000,
  status: "available",
  expiresAt: ago(-10),
  soldAt: null,
  ...over,
})
const market = (prices: number[], over: Partial<PriceListing> = {}) =>
  prices.map((price) => car({ price, ...over }))
const place = (target: PriceListing, others: PriceListing[]) =>
  pricePositionSchema.parse(
    pricePositionOf(target, poolOf([target, ...others], NOW))
  )

describe("price position", () => {
  test("median, middle half and gap; the listing itself is left out", () => {
    const target = car({ price: 13_000_000 })
    const p = place(target, market([8, 9, 10, 11, 12].map((m) => m * 1e6)))
    expect(p).toEqual({
      state: "ok",
      comparables: 5,
      median: 10_000_000,
      low: 9_000_000,
      high: 11_000_000,
      gapPct: 30,
      band: "above",
    })
  })

  test("bands: more than 10% under is below, within 10% is around", () => {
    const others = market([10, 10, 10, 10, 10].map((m) => m * 1e6))
    expect(place(car({ price: 8_900_000 }), others).band).toBe("below")
    expect(place(car({ price: 9_000_000 }), others).band).toBe("around")
    expect(place(car({ price: 11_000_000 }), others).band).toBe("around")
    expect(place(car({ price: 11_100_000 }), others).band).toBe("above")
  })

  test("under 5 comparables shows nothing but the count", () => {
    const p = place(car(), market([1, 2, 3, 4].map((m) => m * 1e6)))
    expect(p).toMatchObject({ state: "few", comparables: 4, band: null })
  })

  test("only year ±1, same intent, new/used and rent period count", () => {
    const others = [
      ...market([1e7, 1e7], { year: 2014 }),
      ...market([1e7, 1e7], { year: 2016 }),
      car({ year: 2017 }),
      car({ condition: "new" }),
      car({ intent: "rent", rentPeriod: "day" }),
      car({ modelId: "toyota-hilux" }),
      car({ kind: "part" }),
    ]
    expect(place(car(), others).comparables).toBe(4)
    const rent = { intent: "rent" as const, rentPeriod: "day" as const }
    const rentals = [
      ...market([1e5, 1e5, 1e5, 1e5, 1e5], rent),
      car({ ...rent, rentPeriod: "week" }),
    ]
    expect(place(car(rent), rentals).comparables).toBe(5)
  })

  test("live now, or sold in the last 90 days; expired and older sales do not count", () => {
    const others = [
      ...market([1e7, 1e7, 1e7]),
      car({ status: "sold", soldAt: ago(89) }),
      car({ status: "sold", soldAt: ago(91) }),
      car({ expiresAt: ago(1) }),
      car({ status: "reserved" }),
    ]
    expect(place(car(), others).comparables).toBe(5)
  })

  test("parts, hand-typed models, no year or no price cannot be compared", () => {
    const others = market([1e7, 1e7, 1e7, 1e7, 1e7])
    for (const over of [
      { kind: "part" as const },
      { modelId: null },
      { year: null },
      { price: 0 },
    ])
      expect(place(car(over), others).state).toBe("none")
  })
})

describe("price report", () => {
  test("an unknown band or page reads as all, page 1", () => {
    expect(priceReportQuerySchema.parse({ band: "cheap", page: "0" })).toEqual({
      band: "all",
      page: 1,
    })
  })

  test("own live listings only, biggest gap first, filter and summary", () => {
    const others = market([1e7, 1e7, 1e7, 1e7, 1e7])
    const mine = [
      car({ ownerUserId: "me", price: 8_000_000 }),
      car({ ownerUserId: "me", price: 13_000_000 }),
      car({ ownerUserId: "me", price: 10_000_000 }),
      car({ ownerUserId: "me", kind: "part" }),
      car({ ownerUserId: "me", status: "sold", soldAt: ago(1) }),
    ]
    const build = (band: "all" | "unknown") =>
      priceReportSchema.parse(
        buildPriceReport({
          userId: "me",
          market: [...others, ...mine],
          cards: new Map(),
          query: { band, page: 1 },
          now: NOW,
        })
      )
    const all = build("all")
    expect(all.summary).toEqual({
      live: 4,
      below: 1,
      around: 1,
      above: 1,
      unknown: 1,
    })
    expect(all.rows.items.map((r) => r.position.band)).toEqual([
      "above",
      "around",
      "below",
      null,
    ])
    expect(build("unknown").rows.total).toBe(1)
  })

  test("the seed gives the demo dealer and seller listings in every band", () => {
    const seed = buildSeed()
    const pool = poolOf(
      seed.listings
        .filter((l) => l.moderation === "approved")
        .map((l) => ({ ...l, soldAt: l.soldAt ?? null })),
      Date.now()
    )
    const bands = (owner: string) =>
      new Set(
        seed.listings
          .filter((l) => l.ownerUserId === owner && l.moderation === "approved")
          .map(
            (l) =>
              pricePositionOf({ ...l, soldAt: l.soldAt ?? null }, pool).band
          )
      )
    expect([...bands("u-dealer")]).toEqual(
      expect.arrayContaining(["above", "below", "around"])
    )
    expect([...bands("u-omar")]).toEqual(
      expect.arrayContaining(["above", "below"])
    )
  })
})
