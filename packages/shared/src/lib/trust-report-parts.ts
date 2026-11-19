import type { Report, VerificationRequest } from "../schemas/admin"
import type { Moderation, RejectionCode } from "../schemas/listing"
import type { Review } from "../schemas/review"
import { median } from "./listings-report"
import { alignStarts, alignTo, type Buckets, sumTimed, within } from "./period"

// What the API and the mock read for the admin Trust & safety tab (step 11.7-r12a). Drafts are left out by the caller.
export type TrustListingInput = {
  createdAt: string
  moderation: Moderation
  decidedAt: string | null
  rejectionCode: RejectionCode | null
}
export type TrustReportInput = Pick<
  Report,
  "reason" | "status" | "createdAt"
> & {
  decidedAt: string | null
}
export type TrustVerificationInput = Pick<
  VerificationRequest,
  "status" | "createdAt"
> & { decidedAt: string | null }
export type TrustReviewInput = Pick<Review, "status"> & {
  flaggedAt: string | null
  decidedAt: string | null
}

const HOUR_MS = 3_600_000

type Timed = { decidedAt: string | null }
export type Window = { from: string; to: string }

const hoursBetween = (from: string, to: string) =>
  (Date.parse(to) - Date.parse(from)) / HOUR_MS
const roundOrNull = (n: number | null) => (n === null ? null : Math.round(n))
export const decidedIn = <T extends Timed>(rows: T[], w: Window) =>
  rows.filter(
    (r): r is T & { decidedAt: string } =>
      !!r.decidedAt && within(r.decidedAt, w.from, w.to)
  )

// Each window's rows matching `keep`, counted now and in the compare window.
export function countOf<T>(now: T[], before: T[], keep: (row: T) => boolean) {
  return {
    count: now.filter(keep).length,
    previous: before.filter(keep).length,
  }
}

// Median whole hours from `start` to `decidedAt`, now and in the compare window.
export function hoursOf<T extends { decidedAt: string }>(
  now: T[],
  before: T[],
  start: (row: T) => string | null
) {
  const of = (rows: T[]) =>
    roundOrNull(
      median(
        rows.flatMap((r) => {
          const s = start(r)
          return s ? [Math.max(0, hoursBetween(s, r.decidedAt))] : []
        })
      )
    )
  return { median: of(now), previous: of(before) }
}

export function waitingOf(starts: string[], now: number) {
  const oldest = Math.min(...starts.map((s) => Date.parse(s)))
  return {
    count: starts.length,
    oldestHours: starts.length ? Math.floor((now - oldest) / HOUR_MS) : null,
  }
}

export type Parts = {
  listings: TrustListingInput[]
  reports: TrustReportInput[]
  verifications: TrustVerificationInput[]
  reviews: TrustReviewInput[]
  w: Window
  prev: Window
  current: Buckets
  compare: Buckets
  now: number
}

export function reportsPart(input: Parts) {
  const { reports, w, prev, current, compare, now } = input
  const length = current.starts.length
  const inWindow = (win: Window) =>
    reports.filter((r) => within(r.createdAt, win.from, win.to))
  const got = inWindow(w)
  const gotBefore = inWindow(prev)
  const closed = decidedIn(reports, w).filter((r) => r.status !== "open")
  const closedBefore = decidedIn(reports, prev).filter(
    (r) => r.status !== "open"
  )
  const reasons = [...new Set(got.map((r) => r.reason))]
  const series = (g: TrustReportInput[], c: typeof closed, bk: Buckets) => {
    const received = alignTo(
      sumTimed(
        bk,
        g.map((r) => [r.createdAt, 1])
      ),
      length
    )
    const resolved = alignTo(
      sumTimed(
        bk,
        c.map((r) => [r.decidedAt, 1])
      ),
      length
    )
    return alignStarts(bk.starts, length).map((date, i) => ({
      date,
      received: received[i] ?? 0,
      resolved: resolved[i] ?? 0,
    }))
  }
  const is = (s: Report["status"]) => (r: TrustReportInput) => r.status === s
  return {
    received: { count: got.length, previous: gotBefore.length },
    byReason: reasons
      .map((reason) => ({
        reason,
        count: got.filter((r) => r.reason === reason).length,
      }))
      .sort((x, y) => y.count - x.count || x.reason.localeCompare(y.reason)),
    dismissed: countOf(closed, closedBefore, is("dismissed")),
    actioned: countOf(closed, closedBefore, is("actioned")),
    resolveHours: hoursOf(closed, closedBefore, (r) => r.createdAt),
    open: waitingOf(
      reports.filter(is("open")).map((r) => r.createdAt),
      now
    ),
    series: series(got, closed, current),
    previousSeries: series(gotBefore, closedBefore, compare),
  }
}

export function verificationsPart(input: Parts) {
  const { verifications: v, w, prev, now } = input
  const a = decidedIn(v, w).filter((r) => r.status !== "pending")
  const b = decidedIn(v, prev).filter((r) => r.status !== "pending")
  const is =
    (s: VerificationRequest["status"]) => (r: TrustVerificationInput) =>
      r.status === s
  return {
    approved: countOf(a, b, is("approved")),
    rejected: countOf(a, b, is("rejected")),
    hours: hoursOf(a, b, (r) => r.createdAt),
    pending: waitingOf(
      v.filter(is("pending")).map((r) => r.createdAt),
      now
    ),
  }
}

export function reviewsPart(input: Parts) {
  const { reviews, w, prev, now } = input
  const flaggedIn = (win: Window) =>
    reviews.filter((r) => r.flaggedAt && within(r.flaggedAt, win.from, win.to))
      .length
  // Out of the queue: a review flagged again since its last decision is waiting, not decided.
  const out = (win: Window) =>
    decidedIn(reviews, win).filter((r) => r.status !== "flagged")
  const a = out(w)
  const b = out(prev)
  const is = (s: Review["status"]) => (r: TrustReviewInput) => r.status === s
  return {
    flagged: { count: flaggedIn(w), previous: flaggedIn(prev) },
    hidden: countOf(a, b, is("hidden")),
    kept: countOf(a, b, is("visible")),
    hours: hoursOf(a, b, (r) =>
      r.flaggedAt && r.flaggedAt <= r.decidedAt ? r.flaggedAt : null
    ),
    // A flag from before r12a has no time; it waits without an age.
    waiting: waitingOf(
      reviews.flatMap((r) =>
        r.status === "flagged" && r.flaggedAt ? [r.flaggedAt] : []
      ),
      now
    ),
  }
}
