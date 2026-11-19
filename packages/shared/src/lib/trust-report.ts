import type { Moderation } from "../schemas/listing"
import type { Period } from "../schemas/period"
import { QUEUE_AGES, type TrustReport } from "../schemas/reports-trust"
import { alignStarts, alignTo, type Buckets, sumTimed } from "./period"
import {
  countOf,
  decidedIn,
  hoursOf,
  type Parts,
  reportsPart,
  reviewsPart,
  type TrustListingInput,
  type TrustReportInput,
  type TrustReviewInput,
  type TrustVerificationInput,
  verificationsPart,
  waitingOf,
} from "./trust-report-parts"

export type {
  TrustListingInput,
  TrustReportInput,
  TrustReviewInput,
  TrustVerificationInput,
}

const HOUR_MS = 3_600_000
const AGE_LIMITS = [6, 24, 72]

function queueOf(listings: TrustListingInput[], now: number) {
  const starts = listings
    .filter((l) => l.moderation === "pending")
    .map((l) => l.createdAt)
  const ageOf = (s: string) => {
    const i = AGE_LIMITS.findIndex((h) => (now - Date.parse(s)) / HOUR_MS < h)
    return i === -1 ? AGE_LIMITS.length : i
  }
  return {
    ...waitingOf(starts, now),
    ages: QUEUE_AGES.map((age, i) => ({
      age,
      count: starts.filter((s) => ageOf(s) === i).length,
    })),
  }
}

// Per bucket, how many rows of each state were decided in it.
function statesSeries<K extends string>(
  b: Buckets,
  length: number,
  rows: { decidedAt: string; state: K }[],
  states: readonly K[]
) {
  const per = states.map((s) =>
    alignTo(
      sumTimed(
        b,
        rows.filter((r) => r.state === s).map((r) => [r.decidedAt, 1])
      ),
      length
    )
  )
  return alignStarts(b.starts, length).map((date, i) => ({
    date,
    ...(Object.fromEntries(
      states.map((s, k) => [s, per[k]?.[i] ?? 0])
    ) as Record<K, number>),
  }))
}

function listingsPart(input: Parts) {
  const { listings, w, prev, current, compare, now } = input
  const length = current.starts.length
  const a = decidedIn(listings, w)
  const b = decidedIn(listings, prev)
  const is = (m: Moderation) => (l: TrustListingInput) => l.moderation === m
  const judged = (l: TrustListingInput) =>
    l.moderation === "approved" || l.moderation === "rejected"
  const rejected = a.filter(is("rejected"))
  const codeOf = (l: TrustListingInput) =>
    l.rejectionCode ?? ("unknown" as const)
  const codes = [...new Set(rejected.map(codeOf))]
  const STATES = ["approved", "rejected", "removed"] as const
  const series = (rows: typeof a, bk: Buckets) =>
    statesSeries(
      bk,
      length,
      rows.flatMap((l) =>
        l.moderation === "approved" ||
        l.moderation === "rejected" ||
        l.moderation === "removed"
          ? [{ decidedAt: l.decidedAt, state: l.moderation }]
          : []
      ),
      STATES
    )
  return {
    approved: countOf(a, b, is("approved")),
    rejected: countOf(a, b, is("rejected")),
    removed: countOf(a, b, is("removed")),
    waitHours: hoursOf(a.filter(judged), b.filter(judged), (l) => l.createdAt),
    queue: queueOf(listings, now),
    reasons: codes
      .map((code) => ({
        code,
        count: rejected.filter((l) => codeOf(l) === code).length,
      }))
      .sort((x, y) => y.count - x.count || x.code.localeCompare(y.code)),
    series: series(a, current),
    previousSeries: series(b, compare),
  }
}

/** The admin Trust & safety tab: listing decisions and queue, abuse reports, verification turnaround and flagged reviews, at `now`. */
export function buildTrustReport(input: {
  period: Period
  listings: TrustListingInput[]
  reports: TrustReportInput[]
  verifications: TrustVerificationInput[]
  reviews: TrustReviewInput[]
  current: Buckets
  compare: Buckets
  now: number
}): TrustReport {
  const { period } = input
  const parts: Parts = {
    ...input,
    w: { from: period.from, to: period.to },
    prev: { from: period.compareFrom, to: period.compareTo },
  }
  const reviews = reviewsPart(parts)
  return {
    period,
    listings: listingsPart(parts),
    reports: reportsPart(parts),
    verifications: verificationsPart(parts),
    reviews: {
      ...reviews,
      waiting: {
        ...reviews.waiting,
        count: input.reviews.filter((r) => r.status === "flagged").length,
      },
    },
  }
}
