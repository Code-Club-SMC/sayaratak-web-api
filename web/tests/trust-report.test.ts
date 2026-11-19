import { describe, expect, test } from "vitest"

import { bucketsOf, resolvePeriod } from "@sayaratak/shared/lib/period"
import {
  buildTrustReport,
  type TrustListingInput,
  type TrustReportInput,
  type TrustReviewInput,
  type TrustVerificationInput,
} from "@sayaratak/shared/lib/trust-report"
import { trustReportSchema } from "@sayaratak/shared/schemas/reports-trust"

// Step 11.7-r12a admin Trust & safety rules, checked on the shared builder the api and the mock both use.
const NOW = Date.parse("2026-11-18T10:00:00Z")
const HOUR = 3_600_000
const DAY = 24 * HOUR
const ago = (ms: number) => new Date(NOW - ms).toISOString()
const period = resolvePeriod(
  { range: "30d", compare: "previous" },
  "2026-11-18"
)
const buckets = (first: string, last: string) => ({
  starts: bucketsOf(first, last, "day"),
  end: last,
  hourly: false,
})

const listing = (over: Partial<TrustListingInput>): TrustListingInput => ({
  createdAt: ago(5 * DAY),
  moderation: "approved",
  decidedAt: ago(5 * DAY - 4 * HOUR),
  rejectionCode: null,
  ...over,
})
const report = (over: Partial<TrustReportInput>): TrustReportInput => ({
  reason: "scam",
  status: "open",
  createdAt: ago(2 * DAY),
  decidedAt: null,
  ...over,
})

function build(input: {
  listings?: TrustListingInput[]
  reports?: TrustReportInput[]
  verifications?: TrustVerificationInput[]
  reviews?: TrustReviewInput[]
}) {
  return trustReportSchema.parse(
    buildTrustReport({
      period,
      listings: input.listings ?? [],
      reports: input.reports ?? [],
      verifications: input.verifications ?? [],
      reviews: input.reviews ?? [],
      current: buckets("2026-10-20", "2026-11-18"),
      compare: buckets("2026-09-20", "2026-10-19"),
      now: NOW,
    })
  )
}

describe("listing decisions", () => {
  test("counts by state now, waits only for approve and reject, sorts reasons", () => {
    const r = build({
      listings: [
        listing({}),
        listing({
          moderation: "rejected",
          decidedAt: ago(5 * DAY - 8 * HOUR),
          rejectionCode: "photos",
        }),
        listing({ moderation: "rejected", rejectionCode: "photos" }),
        listing({ moderation: "rejected" }),
        // A removal is a decision but has no wait.
        listing({ moderation: "removed", decidedAt: ago(DAY) }),
        // Decided in the compare window.
        listing({ createdAt: ago(40 * DAY), decidedAt: ago(39 * DAY) }),
      ],
    }).listings
    expect(r.approved).toEqual({ count: 1, previous: 1 })
    expect(r.rejected.count).toBe(3)
    expect(r.removed.count).toBe(1)
    // 4, 8, 4, 4 hours.
    expect(r.waitHours.median).toBe(4)
    expect(r.reasons).toEqual([
      { code: "photos", count: 2 },
      { code: "unknown", count: 1 },
    ])
    expect(r.series.reduce((n, p) => n + p.rejected, 0)).toBe(3)
  })

  test("puts each pending listing in one age band and reports the oldest", () => {
    const pending = (hours: number) =>
      listing({
        moderation: "pending",
        createdAt: ago(hours * HOUR),
        decidedAt: null,
      })
    const q = build({
      listings: [pending(1), pending(7), pending(30), pending(100)],
    }).listings.queue
    expect(q.count).toBe(4)
    expect(q.oldestHours).toBe(100)
    expect(q.ages.map((a) => a.count)).toEqual([1, 1, 1, 1])
  })
})

describe("abuse reports", () => {
  test("receives by creation, closes by decision, keeps open ones waiting", () => {
    const r = build({
      reports: [
        report({}),
        report({ reason: "duplicate" }),
        report({
          status: "dismissed",
          createdAt: ago(3 * DAY),
          decidedAt: ago(3 * DAY - 10 * HOUR),
        }),
        report({
          reason: "duplicate",
          status: "actioned",
          createdAt: ago(45 * DAY),
          decidedAt: ago(DAY),
        }),
      ],
    }).reports
    expect(r.received).toEqual({ count: 3, previous: 1 })
    expect(r.byReason[0]).toEqual({ reason: "scam", count: 2 })
    expect(r.dismissed.count).toBe(1)
    expect(r.actioned.count).toBe(1)
    expect(r.resolveHours.median).toBe((10 + 44 * 24) / 2)
    expect(r.open).toEqual({ count: 2, oldestHours: 48 })
  })
})

describe("verifications and flagged reviews", () => {
  test("verification turnaround and the pending count", () => {
    const v = build({
      verifications: [
        {
          status: "approved",
          createdAt: ago(2 * DAY),
          decidedAt: ago(2 * DAY - 6 * HOUR),
        },
        { status: "pending", createdAt: ago(5 * HOUR), decidedAt: null },
      ],
    }).verifications
    expect(v.approved.count).toBe(1)
    expect(v.hours.median).toBe(6)
    expect(v.pending).toEqual({ count: 1, oldestHours: 5 })
  })

  test("flag to decision; a flag again since the last decision waits; an old flag has no age", () => {
    const rv = build({
      reviews: [
        {
          status: "hidden",
          flaggedAt: ago(3 * DAY),
          decidedAt: ago(3 * DAY - 2 * HOUR),
        },
        {
          status: "visible",
          flaggedAt: ago(2 * DAY),
          decidedAt: ago(2 * DAY - 4 * HOUR),
        },
        { status: "flagged", flaggedAt: ago(HOUR), decidedAt: ago(DAY) },
        { status: "flagged", flaggedAt: null, decidedAt: null },
      ],
    }).reviews
    expect(rv.flagged.count).toBe(3)
    expect(rv.hidden.count).toBe(1)
    expect(rv.kept.count).toBe(1)
    expect(rv.hours.median).toBe(3)
    expect(rv.waiting).toEqual({ count: 2, oldestHours: 1 })
  })
})
