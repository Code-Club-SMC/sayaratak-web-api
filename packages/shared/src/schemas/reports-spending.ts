import { z } from "zod"

import { paymentSchema } from "./billing"
import { periodSchema } from "./period"

export const SPEND_TYPES = paymentSchema.shape.itemType.options

// Receipts sent inside a window: how many and their SDG total.
const moneySchema = z.object({
  count: z.number().int(),
  amount: z.number().int(),
})

// Approved SDG per bucket, split by what was paid for.
const spendSeriesSchema = z.array(
  z.object({
    date: z.string(),
    plan: z.number().int(),
    promotion: z.number().int(),
    campaign: z.number().int(),
  })
)

// The account's spending (step 11.7-r9, owner 2026-11-19): Bankak receipts by the day they were sent. Approved is money spent; pending and rejected are shown apart.
export const spendingReportSchema = z.object({
  period: periodSchema,
  approved: moneySchema,
  previous: moneySchema,
  pending: moneySchema,
  rejected: moneySchema,
  // Approved in the period; plan, promotion, campaign.
  byType: z.array(moneySchema.extend({ type: z.enum(SPEND_TYPES) })),
  series: spendSeriesSchema,
  previousSeries: spendSeriesSchema,
  // Every receipt sent in the period, newest first.
  payments: z.array(
    paymentSchema.pick({
      id: true,
      itemType: true,
      itemLabel: true,
      amount: true,
      status: true,
      createdAt: true,
    })
  ),
})
export type SpendingReport = z.infer<typeof spendingReportSchema>
