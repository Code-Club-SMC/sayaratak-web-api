import { describe, expect, test } from "vitest"

import { buildDemandReport } from "@sayaratak/shared/lib/demand-report"
import { bucketsOf, resolvePeriod } from "@sayaratak/shared/lib/period"
import {
  buildPromotionsReport,
  type PromotionInput,
  promotionStretches,
} from "@sayaratak/shared/lib/promotions-report"
import {
  buildRepliesReport,
  type ThreadInput,
} from "@sayaratak/shared/lib/replies-report"
import { buildReviewsReport } from "@sayaratak/shared/lib/reviews-report"
import { demandReportSchema } from "@sayaratak/shared/schemas/reports-demand"
import { promotionsReportSchema } from "@sayaratak/shared/schemas/reports-promotions"
import { repliesReportSchema } from "@sayaratak/shared/schemas/reports-replies"
import { reviewsReportSchema } from "@sayaratak/shared/schemas/reports-reviews"

// Step 11.7-r6 report rules (owner 2026-11-18), checked on the shared builders the api and the mock both use.
const NOW = Date.parse("2026-11-18T10:00:00Z")
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString()
const period = resolvePeriod(
  { range: "30d", compare: "previous" },
  "2026-11-18"
)

describe("promotions", () => {
  const promo = (over: Partial<PromotionInput>): PromotionInput => ({
    id: "p1",
    listingId: "l1",
    type: "featured",
    source: "paid",
    startsAt: ago(10),
    endsAt: ago(3),
    amount: 21000,
    ...over,
  })
  const stretches = (promotions: PromotionInput[]) =>
    promotionStretches({
      promotions,
      period,
      now: NOW,
      liveSince: new Map([["l1", ago(60)]]),
    })

  test("a Featured is measured while it ran against the same length before it", () => {
    const [s] = stretches([promo({})])
    expect(s?.start).toBe("2026-11-08T12:00")
    expect(s?.end).toBe("2026-11-15T12:00")
    expect(s?.before).toBe("2026-11-01T12:00")
  })

  test("a bump counts 3 days and is cut by the next promotion of the listing", () => {
    const [later, bump] = stretches([
      promo({ id: "b", type: "bump", startsAt: ago(10), endsAt: ago(10) }),
      promo({ id: "f", startsAt: ago(9), endsAt: ago(2) }),
    ])
    expect(later?.promotion.id).toBe("f")
    expect(bump?.end).toBe("2026-11-09T12:00")
  })

  test("a running promotion stops at now; one outside the period is left out", () => {
    const rows = stretches([
      promo({ id: "run", startsAt: ago(2), endsAt: ago(-5) }),
      promo({ id: "old", startsAt: ago(80), endsAt: ago(70) }),
    ])
    expect(rows.map((r) => r.promotion.id)).toEqual(["run"])
    expect(rows[0]?.end).toBe("2026-11-18T12:00")
  })

  test("extra contacts and cost per extra contact; free ones cost nothing", () => {
    const [paid] = stretches([promo({})])
    const [free] = stretches([
      promo({ id: "g", source: "admin_grant", amount: null }),
    ])
    if (!paid || !free) throw new Error("no stretch")
    const card = { slug: "s", title: "T", coverUrl: null }
    const report = promotionsReportSchema.parse(
      buildPromotionsReport({
        period,
        campaigns: [],
        stretches: [
          {
            ...paid,
            card,
            beforeCounts: { views: 70, contacts: 7 },
            duringCounts: { views: 210, contacts: 21 },
          },
          {
            ...free,
            card,
            beforeCounts: { views: 70, contacts: 7 },
            duringCounts: { views: 70, contacts: 3 },
          },
        ],
      })
    )
    const [a, b] = report.promotions
    expect(a?.extraContacts).toBe(14)
    expect(a?.costPerExtraContact).toBe(1500)
    expect(b?.extraContacts).toBe(-4)
    expect(b?.costPerExtraContact).toBeNull()
    expect(report.summary).toEqual({
      spent: 21000,
      extraContacts: 10,
      costPerExtraContact: 1500,
    })
  })
})

describe("demand", () => {
  test("makes under 5 market listings fold into Other, last; shares are whole percents", () => {
    const market = [
      ...Array.from({ length: 5 }, () => ({
        makeId: "toyota",
        modelId: "hilux",
        views: 30,
      })),
      { makeId: "kia", modelId: null, views: 50 },
    ]
    const report = demandReportSchema.parse(
      buildDemandReport({
        period,
        scope: "city",
        cityId: "khartoum",
        market,
        stock: [
          { makeId: "kia", modelId: null },
          { makeId: "toyota", modelId: "hilux" },
          { makeId: "toyota", modelId: "corolla" },
        ],
      })
    )
    expect(report.makes.map((m) => m.makeId)).toEqual(["toyota", null])
    expect(report.makes[0]).toMatchObject({ viewShare: 75, stockShare: 67 })
    expect(report.makes[0]?.models.map((m) => m.modelId)).toEqual([
      "hilux",
      null,
    ])
    expect(report.makes[1]).toMatchObject({ viewShare: 25, stockShare: 33 })
  })
})

describe("replies", () => {
  const thread = (id: string, messages: [boolean, number][]): ThreadInput => ({
    id,
    subjectTitle: { ar: id, en: id },
    messages: messages.map(([mine, hoursAgo]) => ({
      mine,
      createdAt: new Date(NOW - hoursAgo * 3_600_000).toISOString(),
    })),
  })

  test("median first reply, 24 h rate leaving out young unanswered threads, waiting list", () => {
    const report = repliesReportSchema.parse(
      buildRepliesReport({
        period,
        now: NOW,
        threads: [
          thread("fast", [
            [false, 100],
            [true, 99.5],
          ]),
          thread("slow", [
            [false, 100],
            [true, 70],
          ]),
          thread("never", [[false, 50]]),
          thread("young", [[false, 2]]),
          thread("mine", [
            [true, 10],
            [false, 5],
          ]),
        ],
      })
    )
    expect(report.summary).toEqual({
      threads: 4,
      medianMinutes: 915,
      replyRate: 33,
    })
    expect(report.speed.find((s) => s.key === "none")?.count).toBe(2)
    expect(report.unanswered.items.map((i) => i.threadId)).toEqual([
      "never",
      "mine",
      "young",
    ])
  })
})

describe("reviews", () => {
  test("average per bucket with gaps, stars, reply rate and time", () => {
    const starts = bucketsOf("2026-10-20", "2026-11-18", "day")
    const buckets = { starts, end: "2026-11-18", hourly: false }
    const report = reviewsReportSchema.parse(
      buildReviewsReport({
        period,
        current: buckets,
        compare: buckets,
        reviews: [
          { rating: 5, createdAt: ago(1), replyAt: ago(0.5) },
          { rating: 4, createdAt: ago(1), replyAt: null },
          { rating: 1, createdAt: ago(200), replyAt: null },
        ],
      })
    )
    expect(report.allTime).toEqual({ count: 3, average: 3.3 })
    expect(report.summary).toEqual({
      count: 2,
      average: 4.5,
      replyRate: 50,
      medianReplyHours: 12,
    })
    expect(report.stars.map((s) => s.count)).toEqual([1, 1, 0, 0, 0])
    expect(report.trend.at(-2)?.average).toBe(4.5)
    expect(report.trend.at(-1)?.average).toBeNull()
  })
})
