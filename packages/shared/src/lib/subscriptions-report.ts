import type { Subscription } from "../schemas/billing"
import type { Period } from "../schemas/period"
import type { RevenueReport } from "../schemas/reports-revenue"
import {
  alignStarts,
  alignTo,
  type Buckets,
  instantOf,
  sumTimed,
  within,
} from "./period"

// What the API and the mock read per subscription (step 11.7-r11).
export type SubscriptionInput = Pick<
  Subscription,
  "id" | "userId" | "planId" | "status" | "startsAt" | "endsAt" | "price"
>

const DAY_MS = 86_400_000
export const RENEW_GRACE_DAYS = 7
export const EXPIRING_DAYS = 30

type Run = { sub: SubscriptionInput; start: number; end: number }

/** Paid subscriptions that ran (price above 0, never the unpaid `pending` ones). A canceled one ended when the account's next subscription started. */
export function runsOf(subs: SubscriptionInput[]): Run[] {
  const starts = new Map<string, number[]>()
  for (const s of subs) {
    if (s.status === "pending") continue
    const list = starts.get(s.userId) ?? []
    list.push(Date.parse(s.startsAt))
    starts.set(s.userId, list)
  }
  return subs
    .filter((s) => s.price > 0 && s.status !== "pending")
    .map((sub) => {
      const start = Date.parse(sub.startsAt)
      const due = Date.parse(sub.endsAt)
      const next = (starts.get(sub.userId) ?? []).filter((t) => t > start)
      const end = sub.status === "canceled" ? Math.min(due, ...next) : due
      return { sub, start, end }
    })
}

// The instant a bucket starting at a day or an hour key begins.
const startOf = (key: string) =>
  instantOf(key.length === 10 ? `${key}T00:00` : key)

function seriesOf(
  runs: Run[],
  b: Buckets,
  input: { to: string; now: number; length: number }
) {
  const started = alignTo(
    sumTimed(
      b,
      runs.map((r): [string, number] => [r.sub.startsAt, 1])
    ),
    input.length
  )
  const ends = b.starts.map((_, i) => {
    const next = b.starts[i + 1]
    return Math.min(next ? startOf(next) : instantOf(input.to), input.now)
  })
  const active = alignTo(
    ends.map((t) => runs.filter((r) => r.start <= t && r.end > t).length),
    input.length
  )
  return alignStarts(b.starts, input.length).map((date, i) => ({
    date,
    active: active[i] ?? 0,
    started: started[i] ?? 0,
  }))
}

/** Renewal in a window: paid runs due to end in it, renewed by another paid run starting before the end plus the grace days. */
function renewalOf(runs: Run[], window: [string, string], now: number) {
  let due = 0
  let renewed = 0
  for (const r of runs) {
    if (!within(r.sub.endsAt, window[0], window[1])) continue
    const limit = Date.parse(r.sub.endsAt) + RENEW_GRACE_DAYS * DAY_MS
    const again = runs.some(
      (o) =>
        o.sub.userId === r.sub.userId && o.start > r.start && o.start <= limit
    )
    if (!again && limit > now) continue
    due++
    if (again) renewed++
  }
  return { due, renewed, rate: due ? Math.round((renewed / due) * 100) : null }
}

/** The subscription and renewal parts of the Revenue tab at `now`. */
export function subscriptionsPart(input: {
  period: Period
  subs: SubscriptionInput[]
  current: Buckets
  compare: Buckets
  now: number
}): Pick<RevenueReport, "subscriptions" | "renewal"> {
  const { period, current, compare, now } = input
  const runs = runsOf(input.subs)
  const length = current.starts.length
  const startedIn = (a: string, b: string) =>
    runs.filter((r) => within(r.sub.startsAt, a, b)).length
  const renewal = renewalOf(runs, [period.from, period.to], now)
  return {
    subscriptions: {
      activeNow: runs.filter(
        (r) => r.sub.status === "active" && r.start <= now && r.end > now
      ).length,
      started: {
        count: startedIn(period.from, period.to),
        previous: startedIn(period.compareFrom, period.compareTo),
      },
      series: seriesOf(runs, current, { to: period.to, now, length }),
      previousSeries: seriesOf(runs, compare, {
        to: period.compareTo,
        now,
        length,
      }),
    },
    renewal: {
      ...renewal,
      previous: renewalOf(runs, [period.compareFrom, period.compareTo], now)
        .rate,
    },
  }
}

/** Active paid subscriptions ending within the next 30 days, soonest first. */
export function expiringOf(subs: SubscriptionInput[], now: number) {
  const until = now + EXPIRING_DAYS * DAY_MS
  return subs
    .filter((s) => {
      const end = Date.parse(s.endsAt)
      return s.status === "active" && s.price > 0 && end >= now && end <= until
    })
    .sort(
      (a, b) => a.endsAt.localeCompare(b.endsAt) || a.id.localeCompare(b.id)
    )
}
