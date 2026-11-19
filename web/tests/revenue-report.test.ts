import { describe, expect, test } from "vitest"

import { bucketsOf, resolvePeriod } from "@sayaratak/shared/lib/period"
import {
  buildRevenueReport,
  type RevenueAccountInput,
  type RevenuePaymentInput,
} from "@sayaratak/shared/lib/revenue-report"
import type { SubscriptionInput } from "@sayaratak/shared/lib/subscriptions-report"
import { revenueReportSchema } from "@sayaratak/shared/schemas/reports-revenue"

// Step 11.7-r11 admin Revenue rules, checked on the shared builder the api and the mock both use.
const NOW = Date.parse("2026-11-18T10:00:00Z")
const DAY = 86_400_000
const ago = (days: number) => new Date(NOW - days * DAY).toISOString()
const period = resolvePeriod(
  { range: "30d", compare: "previous" },
  "2026-11-18"
)
const buckets = (first: string, last: string) => ({
  starts: bucketsOf(first, last, "day"),
  end: last,
  hourly: false,
})

const accounts: RevenueAccountInput[] = [
  {
    id: "d",
    role: "dealership",
    name: { ar: "د", en: "D" },
    businessId: "d-1",
  },
  { id: "w", role: "workshop", name: { ar: "و", en: "W" }, businessId: "w-1" },
  { id: "u", role: "user", name: { ar: "س", en: "Sara" }, businessId: null },
]
const plans = [
  {
    id: "gold",
    name: { ar: "ذهبي", en: "Gold" },
    audience: "dealership" as const,
  },
]

const pay = (
  id: string,
  over: Partial<RevenuePaymentInput> = {}
): RevenuePaymentInput => ({
  id,
  userId: "d",
  itemType: "plan",
  itemId: "gold",
  amount: 30_000,
  status: "approved",
  createdAt: ago(5),
  reviewedAt: ago(4),
  ...over,
})
const sub = (
  id: string,
  over: Partial<SubscriptionInput> = {}
): SubscriptionInput => ({
  id,
  userId: "d",
  planId: "gold",
  status: "expired",
  startsAt: ago(60),
  endsAt: ago(20),
  price: 30_000,
  ...over,
})

const report = (input: {
  payments?: RevenuePaymentInput[]
  subs?: SubscriptionInput[]
}) =>
  revenueReportSchema.parse(
    buildRevenueReport({
      period,
      payments: input.payments ?? [],
      subs: input.subs ?? [],
      accounts,
      plans,
      current: buckets("2026-10-20", "2026-11-18"),
      compare: buckets("2026-09-20", "2026-10-19"),
      now: NOW,
    })
  )

describe("admin revenue report", () => {
  test("money counts on the day of approval, not the day sent", () => {
    const r = report({
      payments: [
        pay("in"),
        pay("sent-before", { createdAt: ago(40), reviewedAt: ago(10) }),
        pay("approved-before", { createdAt: ago(40), reviewedAt: ago(35) }),
      ],
    })
    expect(r.revenue).toEqual({ count: 2, amount: 60_000 })
    expect(r.previous).toEqual({ count: 1, amount: 30_000 })
    expect(r.byPlan).toEqual([
      {
        planId: "gold",
        name: plans[0]?.name,
        audience: "dealership",
        count: 2,
        amount: 60_000,
      },
    ])
  })

  test("average per paying business leaves personal accounts apart", () => {
    const r = report({
      payments: [
        pay("a"),
        pay("b", { userId: "w", amount: 10_000 }),
        pay("c", { userId: "u", itemType: "promotion", amount: 2_000 }),
      ],
    })
    expect(r.business).toMatchObject({
      payers: 2,
      amount: 40_000,
      average: 20_000,
    })
    expect(r.personal).toEqual({ payers: 1, amount: 2_000 })
  })

  test("outcomes, review hours and the oldest waiting receipt", () => {
    const r = report({
      payments: [
        pay("ok", { createdAt: ago(3), reviewedAt: ago(2) }),
        pay("no", {
          status: "rejected",
          createdAt: ago(4),
          reviewedAt: new Date(NOW - 4 * DAY + 3 * 3_600_000).toISOString(),
        }),
        pay("wait", {
          status: "pending_review",
          createdAt: ago(2),
          reviewedAt: undefined,
        }),
      ],
    })
    expect(r.outcomes).toMatchObject({ approved: 1, rejected: 1 })
    // 24 h and 3 h: the middle is 13.5, rounded.
    expect(r.reviewHours.median).toBe(14)
    expect(r.pending).toEqual({ count: 1, amount: 30_000, oldestHours: 48 })
  })

  test("renewal: paid again up to 7 days after the end counts, later does not", () => {
    const r = report({
      subs: [
        sub("late-ok", { endsAt: ago(20) }),
        sub("next-ok", {
          startsAt: ago(16),
          endsAt: ago(-14),
          status: "active",
        }),
        sub("lost", { userId: "w", endsAt: ago(25) }),
        sub("lost-next", {
          userId: "w",
          startsAt: ago(10),
          endsAt: ago(-20),
          status: "active",
        }),
        // Ended 3 days ago, not renewed yet: still inside the 7 days, left out.
        sub("open", { userId: "u", endsAt: ago(3) }),
        // Free plans never count.
        sub("free", { userId: "u", price: 0, endsAt: ago(15) }),
      ],
    })
    expect(r.renewal).toMatchObject({ due: 2, renewed: 1, rate: 50 })
  })

  test("a canceled plan ends when the next one starts; plans ending in 30 days are listed", () => {
    const r = report({
      subs: [
        sub("old", { status: "canceled", startsAt: ago(50), endsAt: ago(-10) }),
        sub("new", { status: "active", startsAt: ago(15), endsAt: ago(-5) }),
        sub("far", {
          userId: "w",
          status: "active",
          startsAt: ago(5),
          endsAt: ago(-60),
        }),
        sub("pending", {
          userId: "u",
          status: "pending",
          startsAt: ago(1),
          endsAt: ago(-3),
        }),
      ],
    })
    expect(r.subscriptions.activeNow).toBe(2)
    // At every bucket end only one of "old" and "new" runs for the dealer.
    expect(Math.max(...r.subscriptions.series.map((p) => p.active))).toBe(2)
    expect(r.subscriptions.started.count).toBe(2)
    expect(r.expiring.map((e) => [e.subscriptionId, e.businessId])).toEqual([
      ["new", "d-1"],
    ])
  })
})
