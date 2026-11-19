import { describe, expect, test } from "vitest"

import { resolvePeriod } from "@sayaratak/shared/lib/period"
import {
  buildRankReport,
  type RankPeer,
} from "@sayaratak/shared/lib/rank-report"
import { rankReportSchema } from "@sayaratak/shared/schemas/reports-rank"

// Step 11.7-r8 city rank rules (owner 2026-11-19), checked on the shared builder the api and the mock both use.
const NOW = Date.parse("2026-11-18T10:00:00Z")
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString()
const period = resolvePeriod(
  { range: "30d", compare: "previous" },
  "2026-11-18"
)

const peer = (id: string, over: Partial<RankPeer> = {}): RankPeer => ({
  id,
  cityId: "khartoum",
  views: 0,
  calls: 0,
  whatsapp: 0,
  threads: [],
  stars: 0,
  reviews: 0,
  ...over,
})
const rank = (peers: RankPeer[], selfId: string | null = "me") =>
  rankReportSchema.parse(buildRankReport({ period, selfId, peers, now: NOW }))
const row = (r: ReturnType<typeof rank>, key: string) =>
  r.metrics.find((m) => m.key === key)

describe("city rank", () => {
  test("ranks in the city with 5+ there: share of the others strictly below", () => {
    const r = rank([
      peer("me", { views: 30 }),
      ...[10, 20, 30, 40].map((views, i) => peer(`p${i}`, { views })),
      peer("far", { cityId: "nyala", views: 1 }),
    ])
    expect(r.scope).toBe("city")
    expect(r.peers).toBe(5)
    // Beats 10 and 20 of the 4 others; the tie at 30 does not count.
    expect(row(r, "views")).toMatchObject({
      state: "ok",
      value: 30,
      percentile: 50,
    })
  })

  test("falls back to all Sudan under 5 in the city, and says few under 5 ranked", () => {
    const four = [
      peer("me"),
      peer("a"),
      peer("b"),
      peer("c", { cityId: "nyala" }),
    ]
    const r = rank(four)
    expect(r.scope).toBe("country")
    expect(r.peers).toBe(4)
    expect(row(r, "views")).toMatchObject({ state: "few", percentile: null })
  })

  test("contacts add calls, WhatsApp and messages received in the period", () => {
    const threads = [
      {
        id: "t",
        subjectTitle: { ar: "", en: "" },
        messages: [
          { mine: false, createdAt: ago(2) },
          { mine: true, createdAt: ago(1) },
          { mine: false, createdAt: ago(90) },
        ],
      },
    ]
    const r = rank([
      peer("me", { calls: 2, whatsapp: 1, threads }),
      ...["a", "b", "c", "d"].map((id) => peer(id)),
    ])
    expect(row(r, "contacts")).toMatchObject({ value: 4, percentile: 100 })
    // Answered within 24 h, the others had no inquiry: too few ranked.
    expect(row(r, "replyRate")).toMatchObject({
      state: "few",
      value: 100,
      ranked: 1,
    })
  })

  test("rating needs 3 reviews; under that the account has none", () => {
    const rated = ["a", "b", "c", "d", "e"].map((id, i) =>
      peer(id, { stars: 12 + i, reviews: 3 })
    )
    expect(
      row(rank([peer("me", { stars: 10, reviews: 2 }), ...rated]), "rating")
    ).toMatchObject({
      state: "none",
      value: null,
      ranked: 5,
    })
    const r = rank([peer("me", { stars: 14, reviews: 3 }), ...rated])
    // 4.67 shows as 4.7 and beats 4.0 and 4.33 of the 5 others.
    expect(row(r, "rating")).toMatchObject({
      state: "ok",
      value: 4.7,
      percentile: 40,
    })
  })

  test("no business: nothing ranked", () => {
    const r = rank([peer("a")], null)
    expect(r.peers).toBe(0)
    expect(r.metrics.every((m) => m.state === "none")).toBe(true)
  })
})
