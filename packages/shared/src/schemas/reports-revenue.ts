import { z } from "zod"

import { planSchema } from "./billing"
import { bilingualSchema, roleSchema } from "./fields"
import { periodSchema } from "./period"
import { SPEND_TYPES } from "./reports-spending"

// Admin Insights Revenue tab (step 11.7-r11, owner 2026-11-19). Money counts on the day an admin approved the receipt, like the overview's Revenue card.

const int = z.number().int()
const moneySchema = z.object({ count: int, amount: int })
const medianSchema = z.object({
  median: int.nullable(),
  previous: int.nullable(),
})

// Approved SDG per bucket, split by what was paid for.
const revenuePoint = z.object({
  date: z.string(),
  plan: int,
  promotion: int,
  campaign: int,
})

// Paid subscriptions (price above 0) running at the end of each bucket, and those started in it.
const subscriptionPoint = z.object({
  date: z.string(),
  active: int,
  started: int,
})

export const revenueReportSchema = z.object({
  period: periodSchema,
  // Approved in the period and in the compare window.
  revenue: moneySchema,
  previous: moneySchema,
  byType: z.array(moneySchema.extend({ type: z.enum(SPEND_TYPES) })),
  // Approved plan payments per plan, most money first.
  byPlan: z.array(
    moneySchema.extend({
      planId: z.string(),
      name: bilingualSchema,
      audience: planSchema.shape.audience,
    })
  ),
  series: z.array(revenuePoint),
  previousSeries: z.array(revenuePoint),
  // Receipts an admin decided in the window.
  outcomes: z.object({
    approved: int,
    rejected: int,
    previousApproved: int,
    previousRejected: int,
  }),
  // Whole hours from sending to the decision, for receipts decided in the window.
  reviewHours: medianSchema,
  // Waiting now; `oldestHours` is null when none wait.
  pending: moneySchema.extend({ oldestHours: int.nullable() }),
  subscriptions: z.object({
    activeNow: int,
    started: z.object({ count: int, previous: int }),
    series: z.array(subscriptionPoint),
    previousSeries: z.array(subscriptionPoint),
  }),
  // Paid subscriptions due to end in the window: renewed when the account started another paid one before the end or up to 7 days after it. Ones still inside those 7 days and not renewed yet are left out. `rate` is a whole %, null when none were due.
  renewal: z.object({
    rate: int.nullable(),
    previous: int.nullable(),
    due: int,
    renewed: int,
  }),
  // Dealerships, workshops and mechanics with an approved payment in the window: their money, how many paid and the average per business (null when none paid).
  business: z.object({
    payers: int,
    amount: int,
    average: int.nullable(),
    previousAverage: int.nullable(),
  }),
  // Personal accounts that paid in the window, shown apart.
  personal: z.object({ payers: int, amount: int }),
  // Paid subscriptions ending in the next 30 days, soonest first.
  expiring: z.array(
    z.object({
      subscriptionId: z.string(),
      userId: z.string(),
      role: roleSchema,
      // The business name, else the person's name in both slots.
      name: bilingualSchema,
      // The business to open in admin; null for a personal account or a business not set up yet.
      businessId: z.string().nullable(),
      planId: z.string(),
      planName: bilingualSchema,
      endsAt: z.string(),
      price: int,
    })
  ),
})
export type RevenueReport = z.infer<typeof revenueReportSchema>
