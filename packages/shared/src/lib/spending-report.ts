import type { Payment } from "../schemas/billing"
import type { Period } from "../schemas/period"
import { SPEND_TYPES, type SpendingReport } from "../schemas/reports-spending"
import { alignStarts, alignTo, type Buckets, sumTimed, within } from "./period"

// What the API and the mock read per receipt of the account (step 11.7-r9).
export type SpendInput = Pick<
  Payment,
  "id" | "itemType" | "itemLabel" | "amount" | "status" | "createdAt"
>

const moneyOf = (payments: SpendInput[]) => ({
  count: payments.length,
  amount: payments.reduce((n, p) => n + p.amount, 0),
})

// Approved SDG per bucket and item type.
function seriesOf(approved: SpendInput[], b: Buckets, length: number) {
  const perType = SPEND_TYPES.map((type) =>
    alignTo(
      sumTimed(
        b,
        approved
          .filter((p) => p.itemType === type)
          .map((p) => [p.createdAt, p.amount])
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

/** The Spending report: receipts by the day they were sent; approved is money spent. */
export function buildSpendingReport(input: {
  period: Period
  payments: SpendInput[]
  current: Buckets
  compare: Buckets
}): SpendingReport {
  const { period, payments, current, compare } = input
  const now = payments.filter((p) =>
    within(p.createdAt, period.from, period.to)
  )
  const approvedOf = (list: SpendInput[]) =>
    list.filter((p) => p.status === "approved")
  const approved = approvedOf(now)
  const before = approvedOf(
    payments.filter((p) =>
      within(p.createdAt, period.compareFrom, period.compareTo)
    )
  )
  const length = current.starts.length
  return {
    period,
    approved: moneyOf(approved),
    previous: moneyOf(before),
    pending: moneyOf(now.filter((p) => p.status === "pending_review")),
    rejected: moneyOf(now.filter((p) => p.status === "rejected")),
    byType: SPEND_TYPES.map((type) => ({
      type,
      ...moneyOf(approved.filter((p) => p.itemType === type)),
    })),
    series: seriesOf(approved, current, length),
    previousSeries: seriesOf(before, compare, length),
    payments: [...now]
      .sort(
        (a, b) =>
          b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
      )
      .map(({ id, itemType, itemLabel, amount, status, createdAt }) => ({
        id,
        itemType,
        itemLabel,
        amount,
        status,
        createdAt,
      })),
  }
}
