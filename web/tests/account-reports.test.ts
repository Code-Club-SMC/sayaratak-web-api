import { describe, expect, test } from "vitest"

import { buildAlertsReport } from "@sayaratak/shared/lib/alerts-report"
import { bucketsOf, resolvePeriod } from "@sayaratak/shared/lib/period"
import {
  buildSpendingReport,
  type SpendInput,
} from "@sayaratak/shared/lib/spending-report"
import { alertsReportSchema } from "@sayaratak/shared/schemas/reports-alerts"
import { spendingReportSchema } from "@sayaratak/shared/schemas/reports-spending"

// Step 11.7-r9 personal Spending and Alerts rules, checked on the shared builders the api and the mock both use.
const NOW = Date.parse("2026-11-18T10:00:00Z")
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString()
const period = resolvePeriod(
  { range: "30d", compare: "previous" },
  "2026-11-18"
)
const current = {
  starts: bucketsOf("2026-10-20", "2026-11-18", "day"),
  end: "2026-11-18",
  hourly: false,
}
const compare = {
  starts: bucketsOf("2026-09-20", "2026-10-19", "day"),
  end: "2026-10-19",
  hourly: false,
}
const label = { ar: "x", en: "x" }
const pay = (
  id: string,
  over: Partial<SpendInput> & Pick<SpendInput, "createdAt">
): SpendInput => ({
  id,
  itemType: "promotion",
  itemLabel: label,
  amount: 1000,
  status: "approved",
  ...over,
})

describe("spending", () => {
  test("approved is spent, pending and rejected apart, previous window, by type and bucket", () => {
    const r = spendingReportSchema.parse(
      buildSpendingReport({
        period,
        current,
        compare,
        payments: [
          pay("a", { createdAt: ago(1), itemType: "plan", amount: 5000 }),
          pay("b", { createdAt: ago(2), amount: 2000 }),
          pay("c", { createdAt: ago(3), status: "pending_review" }),
          pay("d", { createdAt: ago(4), status: "rejected", amount: 700 }),
          pay("e", { createdAt: ago(40), amount: 3000 }),
          pay("f", { createdAt: ago(200), amount: 9 }),
        ],
      })
    )
    expect(r.approved).toEqual({ count: 2, amount: 7000 })
    expect(r.previous).toEqual({ count: 1, amount: 3000 })
    expect(r.pending).toEqual({ count: 1, amount: 1000 })
    expect(r.rejected).toEqual({ count: 1, amount: 700 })
    expect(r.byType).toEqual([
      { type: "plan", count: 1, amount: 5000 },
      { type: "promotion", count: 1, amount: 2000 },
      { type: "campaign", count: 0, amount: 0 },
    ])
    expect(r.series).toHaveLength(30)
    expect(r.series.reduce((n, b) => n + b.plan + b.promotion, 0)).toBe(7000)
    expect(r.previousSeries.reduce((n, b) => n + b.promotion, 0)).toBe(3000)
    // Every receipt of the period, newest first.
    expect(r.payments.map((p) => p.id)).toEqual(["a", "b", "c", "d"])
  })
})

describe("alerts", () => {
  test("matches per search in each window, oldest saved first, totals and buckets", () => {
    const search = (id: string, createdAt: string, alerts: boolean) => ({
      id,
      name: id,
      params: {
        kind: "vehicle" as const,
        page: 1,
        sort: "newest" as const,
        includeSold: false,
      },
      alerts,
      newCount: 0,
      createdAt,
    })
    const r = alertsReportSchema.parse(
      buildAlertsReport({
        period,
        current,
        compare,
        searches: [
          {
            ...search("new", ago(5), true),
            matchedAt: [ago(1), ago(1), ago(35)],
          },
          { ...search("old", ago(50), false), matchedAt: [ago(2), ago(300)] },
        ],
      })
    )
    expect(r.rows.map((row) => [row.id, row.matches, row.previous])).toEqual([
      ["old", 1, 0],
      ["new", 2, 1],
    ])
    expect(r).toMatchObject({
      searches: 2,
      alertsOn: 1,
      matches: 3,
      previous: 1,
    })
    expect(r.series.reduce((n, b) => n + b.matches, 0)).toBe(3)
    expect(r.previousSeries.reduce((n, b) => n + b.matches, 0)).toBe(1)
  })
})
