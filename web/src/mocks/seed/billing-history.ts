import type { Payment, Subscription } from "@sayaratak/shared/schemas/billing"
import type { UserRow } from "../types"
import { plans } from "./commerce"
import { DAY, HOUR, ago } from "./util"

// Step 11.7-r11 (owner 2026-11-19): a year of paid plans and their approved receipts for a few
// non-demo businesses, so the admin Revenue tab shows a trend, renewals (on time, a few days
// late, lapsed) and a compare window. Every history plan has ended, so the subscriptions
// running now stay the demo accounts' four (the plan-end job and its tests rely on them).
// No faker draw, so the rest of the seed is unchanged; the
// demo accounts keep their own billing as it was, and Pro stays a plan nobody has held. Each plan runs 30 days.
type Chain = {
  role: "dealership" | "workshop" | "mechanic"
  // Which non-demo business of the role (0 is the first).
  nth: number
  planId: string
  // Days ago each plan started, oldest first.
  starts: number[]
  // Days ago a receipt was sent and rejected, before the next plan.
  rejected?: number[]
}

const every = (from: number, to: number, step = 30) => {
  const out: number[] = []
  for (let d = from; d >= to; d -= step) out.push(d)
  return out
}

const chains: Chain[] = [
  // Paid every month for most of a year; the last plan ended 15 days ago.
  {
    role: "dealership",
    nth: 0,
    planId: "plan-dealer-growth",
    starts: every(345, 45),
  },
  // Renewed 3 days late once, lapsed 17 days, came back, stopped 10 days ago.
  {
    role: "dealership",
    nth: 1,
    planId: "plan-dealer-growth",
    starts: [300, 270, 237, 207, 177, 130, 100, 70, 40],
    rejected: [150],
  },
  // Three months, then left.
  {
    role: "dealership",
    nth: 2,
    planId: "plan-dealer-growth",
    starts: [200, 170, 140],
  },
  // Two months this quarter.
  {
    role: "dealership",
    nth: 3,
    planId: "plan-dealer-growth",
    starts: [88, 58],
  },
  // Paid every month for a year; the last plan ended 5 days ago and may still be renewed.
  {
    role: "workshop",
    nth: 0,
    planId: "plan-workshop-plus",
    starts: every(365, 35),
  },
  // Renewed 4 days late once; the last plan ended 6 days ago and may still be renewed.
  {
    role: "workshop",
    nth: 1,
    planId: "plan-workshop-plus",
    starts: [250, 220, 186, 156, 126, 96, 66, 36],
    rejected: [38],
  },
  // Mechanics paid in the past only, so the mechanic directory order stays as it was.
  {
    role: "mechanic",
    nth: 0,
    planId: "plan-mechanic-plus",
    starts: [330, 300, 270, 240],
  },
  {
    role: "mechanic",
    nth: 1,
    planId: "plan-mechanic-plus",
    starts: [150, 120, 90, 60],
  },
]

const demo = new Set(["u-dealer", "u-workshop", "u-mechanic"])

/** Subscriptions and receipts of the history accounts. */
export function billingHistory(users: UserRow[]) {
  const subs: Subscription[] = []
  const payments: Payment[] = []
  const pay = (
    user: UserRow,
    plan: (typeof plans)[number],
    at: { sent: number; reviewed: number; rejected?: boolean }
  ) => {
    const n = payments.length + 1
    payments.push({
      id: `pay-h-${n}`,
      userId: user.id,
      itemType: "plan",
      itemId: plan.id,
      itemLabel: plan.name,
      amount: plan.price,
      method: "bankak_transfer",
      reference: `SY-${String(200_000 + n * 53)}`,
      payerName: user.fullName,
      transactionRef: String(30_000_000 + n * 7_919),
      receiptUrl: `/api/uploads/receipt-h-${n}`,
      status: at.rejected ? "rejected" : "approved",
      rejectionReason: at.rejected ? "رقم العملية غير مطابق" : undefined,
      createdAt: ago(at.sent),
      reviewedAt: ago(at.reviewed),
    })
  }
  for (const chain of chains) {
    const user = users.filter((u) => u.role === chain.role && !demo.has(u.id))[
      chain.nth
    ]
    const plan = plans.find((p) => p.id === chain.planId)
    if (!user || !plan) continue
    chain.starts.forEach((start, i) => {
      const startsAt = start * DAY
      const endsAt = (start - 30) * DAY
      subs.push({
        id: `sub-h-${subs.length + 1}`,
        userId: user.id,
        planId: plan.id,
        status: "expired",
        startsAt: ago(startsAt),
        endsAt: ago(endsAt),
        price: plan.price,
        usage: { used: 0, limit: plan.listingLimit ?? null },
      })
      // Sent a few hours to two days before the admin approved it, which started the plan.
      pay(user, plan, {
        sent: startsAt + ((i * 7 + chain.nth * 5) % 44) * HOUR + 2 * HOUR,
        reviewed: startsAt,
      })
    })
    for (const day of chain.rejected ?? [])
      pay(user, plan, {
        sent: day * DAY + 20 * HOUR,
        reviewed: day * DAY,
        rejected: true,
      })
  }
  return { subs, payments }
}
