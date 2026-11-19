import type { Bilingual, Role } from "../schemas/fields"
import type { Payment, Plan } from "../schemas/billing"
import type { Period } from "../schemas/period"
import type { RevenueReport } from "../schemas/reports-revenue"
import { SPEND_TYPES } from "../schemas/reports-spending"
import { median } from "./listings-report"
import { alignStarts, alignTo, type Buckets, sumTimed, within } from "./period"
import {
  expiringOf,
  type SubscriptionInput,
  subscriptionsPart,
} from "./subscriptions-report"

// What the API and the mock read for the admin Revenue tab (step 11.7-r11).
export type RevenuePaymentInput = Pick<
  Payment,
  | "id"
  | "userId"
  | "itemType"
  | "itemId"
  | "amount"
  | "status"
  | "createdAt"
  | "reviewedAt"
>
export type RevenueAccountInput = {
  id: string
  role: Role
  name: Bilingual
  businessId: string | null
}

export type PlanInput = Pick<Plan, "id" | "name" | "audience">

const HOUR_MS = 3_600_000
const BUSINESS_ROLES: readonly Role[] = ["dealership", "workshop", "mechanic"]

type Decided = RevenuePaymentInput & { reviewedAt: string }
const decided = (p: RevenuePaymentInput): p is Decided =>
  p.status !== "pending_review" && !!p.reviewedAt

const moneyOf = (payments: RevenuePaymentInput[]) => ({
  count: payments.length,
  amount: payments.reduce((n, p) => n + p.amount, 0),
})

function seriesOf(approved: Decided[], b: Buckets, length: number) {
  const perType = SPEND_TYPES.map((type) =>
    alignTo(
      sumTimed(
        b,
        approved
          .filter((p) => p.itemType === type)
          .map((p) => [p.reviewedAt, p.amount])
      ),
      length
    )
  )
  return alignStarts(b.starts, length).map((date, i) => ({
    date,
    plan: perType[0]?.[i] ?? 0,
    promotion: perType[1]?.[i] ?? 0,
    campaign: perType[2]?.[i] ?? 0,
  }))
}

const hoursOf = (p: Decided) =>
  (Date.parse(p.reviewedAt) - Date.parse(p.createdAt)) / HOUR_MS
const roundOrNull = (n: number | null) => (n === null ? null : Math.round(n))

// Money of the business payers, how many paid and the whole SDG average.
function payersOf(approved: Decided[], roles: Map<string, Role>) {
  const business = approved.filter((p) =>
    BUSINESS_ROLES.includes(roles.get(p.userId) ?? "user")
  )
  const payers = new Set(business.map((p) => p.userId)).size
  const amount = moneyOf(business).amount
  return {
    payers,
    amount,
    average: payers ? Math.round(amount / payers) : null,
  }
}

function personalOf(approved: Decided[], roles: Map<string, Role>) {
  const own = approved.filter((p) => roles.get(p.userId) === "user")
  return {
    payers: new Set(own.map((p) => p.userId)).size,
    amount: moneyOf(own).amount,
  }
}

function byPlanOf(approved: Decided[], list: PlanInput[]) {
  const plans = approved.filter((p) => p.itemType === "plan")
  const known = new Map(list.map((p) => [p.id, p]))
  return [...new Set(plans.map((p) => p.itemId))]
    .map((planId) => ({
      planId,
      name: known.get(planId)?.name ?? { ar: planId, en: planId },
      audience: known.get(planId)?.audience ?? "user",
      ...moneyOf(plans.filter((p) => p.itemId === planId)),
    }))
    .sort((a, b) => b.amount - a.amount || a.planId.localeCompare(b.planId))
}

/** The admin Revenue tab: approved money by day of approval, receipt outcomes, paid subscriptions, renewal, money per business and plans ending soon, at `now`. */
export function buildRevenueReport(input: {
  period: Period
  payments: RevenuePaymentInput[]
  subs: SubscriptionInput[]
  accounts: RevenueAccountInput[]
  plans: PlanInput[]
  current: Buckets
  compare: Buckets
  now: number
}): RevenueReport {
  const { period, payments, current, compare, now } = input
  const done = payments.filter(decided)
  const decidedIn = (a: string, b: string) =>
    done.filter((p) => within(p.reviewedAt, a, b))
  const nowDecided = decidedIn(period.from, period.to)
  const before = decidedIn(period.compareFrom, period.compareTo)
  const approvedOf = (list: Decided[]) =>
    list.filter((p) => p.status === "approved")
  const approved = approvedOf(nowDecided)
  const approvedBefore = approvedOf(before)
  const roles = new Map(input.accounts.map((a) => [a.id, a.role]))
  const length = current.starts.length
  const waiting = payments.filter((p) => p.status === "pending_review")
  const oldest = Math.min(...waiting.map((p) => Date.parse(p.createdAt)))
  return {
    period,
    revenue: moneyOf(approved),
    previous: moneyOf(approvedBefore),
    byType: SPEND_TYPES.map((type) => ({
      type,
      ...moneyOf(approved.filter((p) => p.itemType === type)),
    })),
    byPlan: byPlanOf(approved, input.plans),
    series: seriesOf(approved, current, length),
    previousSeries: seriesOf(approvedBefore, compare, length),
    outcomes: {
      approved: approved.length,
      rejected: nowDecided.length - approved.length,
      previousApproved: approvedBefore.length,
      previousRejected: before.length - approvedBefore.length,
    },
    reviewHours: {
      median: roundOrNull(median(nowDecided.map(hoursOf))),
      previous: roundOrNull(median(before.map(hoursOf))),
    },
    pending: {
      ...moneyOf(waiting),
      oldestHours: waiting.length ? Math.floor((now - oldest) / HOUR_MS) : null,
    },
    ...subscriptionsPart({ period, subs: input.subs, current, compare, now }),
    business: {
      ...payersOf(approved, roles),
      previousAverage: payersOf(approvedBefore, roles).average,
    },
    personal: personalOf(approved, roles),
    expiring: expiringRows(input),
  }
}

function expiringRows(input: {
  subs: SubscriptionInput[]
  accounts: RevenueAccountInput[]
  plans: PlanInput[]
  now: number
}): RevenueReport["expiring"] {
  const accounts = new Map(input.accounts.map((a) => [a.id, a]))
  const names = new Map(input.plans.map((p) => [p.id, p.name]))
  return expiringOf(input.subs, input.now).map((s) => {
    const a = accounts.get(s.userId)
    return {
      subscriptionId: s.id,
      userId: s.userId,
      role: a?.role ?? "user",
      name: a?.name ?? { ar: "", en: "" },
      businessId: a?.businessId ?? null,
      planId: s.planId,
      planName: names.get(s.planId) ?? { ar: s.planId, en: s.planId },
      endsAt: s.endsAt,
      price: s.price,
    }
  })
}
