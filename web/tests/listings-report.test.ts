import { describe, expect, test } from "vitest"

import {
  buildListingsReport,
  type ListingsReportInput,
} from "@sayaratak/shared/lib/listings-report"
import { resolvePeriod } from "@sayaratak/shared/lib/period"
import {
  listingsReportQuerySchema,
  listingsReportSchema,
} from "@sayaratak/shared/schemas/reports"

const NOW = Date.parse("2026-11-18T10:00:00Z")
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString()
const period = resolvePeriod(
  { range: "30d", compare: "previous" },
  "2026-11-18"
)

const row = (over: Partial<ListingsReportInput>): ListingsReportInput => ({
  id: "a",
  slug: "a",
  title: "A",
  coverUrl: null,
  status: "available",
  photos: 8,
  liveSince: daysAgo(20),
  expiresAt: daysAgo(-30),
  soldAt: null,
  views: 100,
  calls: 5,
  whatsapp: 5,
  messages: 0,
  ...over,
})

// Every report the builder makes must match the response schema.
const build = (rows: ListingsReportInput[], q: Record<string, string> = {}) =>
  listingsReportSchema.parse(
    buildListingsReport({
      rows,
      period,
      now: NOW,
      query: listingsReportQuerySchema.parse(q),
    })
  )

describe("buildListingsReport", () => {
  test("flags weak live listings", () => {
    const report = build([
      row({ id: "ok" }),
      row({ id: "none", calls: 0, whatsapp: 0, views: 40 }),
      row({ id: "low", calls: 1, whatsapp: 0, views: 100 }),
      row({ id: "thin", photos: 2 }),
      row({ id: "old", liveSince: daysAgo(75) }),
      row({ id: "young", liveSince: daysAgo(5), calls: 0, whatsapp: 0 }),
    ])
    const flags = Object.fromEntries(
      report.rows.items.map((r) => [r.id, r.flags])
    )
    expect(flags.ok).toEqual([])
    expect(flags.none).toEqual(["no_contacts"])
    expect(flags.low).toEqual(["low_rate"])
    expect(flags.thin).toEqual(["few_photos"])
    expect(flags.old).toEqual(["stale"])
    // Live under 14 days: no "no contacts" yet; 100 views and zero rate still reads as low.
    expect(flags.young).toEqual(["low_rate"])
    expect(report.summary.medianRate).toBe(10)
  })

  test("stock age, expiring soon and days to sell", () => {
    const report = build([
      row({ id: "a", liveSince: daysAgo(3), expiresAt: daysAgo(-2) }),
      row({ id: "b", liveSince: daysAgo(100) }),
      row({
        id: "c",
        status: "sold",
        liveSince: daysAgo(40),
        soldAt: daysAgo(10),
      }),
      row({
        id: "d",
        status: "sold",
        liveSince: daysAgo(30),
        soldAt: daysAgo(10),
      }),
      row({ id: "e", expiresAt: daysAgo(1) }),
    ])
    expect(report.summary.live).toBe(2)
    expect(report.summary.expiringSoon).toBe(1)
    expect(report.summary.stockAge.map((b) => b.count)).toEqual([1, 0, 0, 0, 1])
    expect(report.summary.daysToSell).toEqual({ median: 25, count: 2 })
    expect(report.summary.previousDaysToSell).toEqual({
      median: null,
      count: 0,
    })
    const sold = report.rows.items.find((r) => r.id === "c")
    expect(sold?.daysLive).toBe(30)
    expect(sold?.flags).toEqual([])
    expect(report.rows.items.find((r) => r.id === "e")?.live).toBe(false)
  })

  test("filters, sorts and pages", () => {
    const rows = Array.from({ length: 25 }, (_, i) =>
      row({ id: `r${String(i).padStart(2, "0")}`, views: i })
    )
    const first = build(rows)
    expect(first.rows.total).toBe(25)
    expect(first.rows.items).toHaveLength(20)
    expect(first.rows.items[0]?.views).toBe(24)
    const second = build(rows, { sort: "views_asc", page: "2" })
    expect(second.rows.items.map((r) => r.views)).toEqual([20, 21, 22, 23, 24])
    expect(build(rows, { filter: "expiring" }).rows.total).toBe(0)
  })
})
