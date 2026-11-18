import type { Period } from "../schemas/period"
import type { ReviewsReport } from "../schemas/reports-reviews"
import { median } from "./listings-report"
import { alignStarts, alignTo, type Buckets, sumTimed, within } from "./period"

const HOUR_MS = 3_600_000

// What the API and the mock read per visible review of the business (step 11.7-r6).
export type ReviewInput = {
  rating: number
  createdAt: string
  replyAt: string | null
}

const oneDecimal = (value: number) => Math.round(value * 10) / 10

function statsOf(reviews: ReviewInput[]) {
  const replied = reviews.filter((r) => r.replyAt)
  const hours = median(
    replied.map(
      (r) => (Date.parse(r.replyAt ?? "") - Date.parse(r.createdAt)) / HOUR_MS
    )
  )
  const count = reviews.length
  return {
    count,
    average: count
      ? oneDecimal(reviews.reduce((a, r) => a + r.rating, 0) / count)
      : null,
    replyRate: count ? Math.round((replied.length / count) * 100) : null,
    medianReplyHours: hours === null ? null : Math.round(hours),
  }
}

function trendOf(reviews: ReviewInput[], b: Buckets) {
  const sums = sumTimed(
    b,
    reviews.map((r) => [r.createdAt, r.rating])
  )
  const counts = sumTimed(
    b,
    reviews.map((r) => [r.createdAt, 1])
  )
  return { sums, counts }
}

/** The Reviews report of one business from its visible reviews. */
export function buildReviewsReport(input: {
  period: Period
  reviews: ReviewInput[]
  current: Buckets
  compare: Buckets
}): ReviewsReport {
  const { period, reviews, current, compare } = input
  const now = reviews.filter((r) => within(r.createdAt, period.from, period.to))
  const before = reviews.filter((r) =>
    within(r.createdAt, period.compareFrom, period.compareTo)
  )
  const length = current.starts.length
  const a = trendOf(now, current)
  const b = trendOf(before, compare)
  const [bSums, bCounts] = [alignTo(b.sums, length), alignTo(b.counts, length)]
  const avg = (sum = 0, count = 0) => (count ? oneDecimal(sum / count) : null)
  const all = statsOf(reviews)
  return {
    period,
    allTime: { count: all.count, average: all.average },
    summary: statsOf(now),
    previous: statsOf(before),
    stars: [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: now.filter((r) => r.rating === stars).length,
    })),
    trend: current.starts.map((date, i) => ({
      date,
      average: avg(a.sums[i], a.counts[i]),
      count: a.counts[i] ?? 0,
    })),
    previousTrend: alignStarts(compare.starts, length).map((date, i) => ({
      date,
      average: avg(bSums[i], bCounts[i]),
      count: bCounts[i] ?? 0,
    })),
  }
}
