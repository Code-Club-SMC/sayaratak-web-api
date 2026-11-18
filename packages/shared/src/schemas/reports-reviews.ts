import { z } from "zod"

import { periodSchema } from "./period"

// Visible reviews inside a window: count, average stars (one decimal), share replied to (whole percent) and median hours to the reply.
const reviewStatsSchema = z.object({
  count: z.number().int(),
  average: z.number().nullable(),
  replyRate: z.number().int().nullable(),
  medianReplyHours: z.number().int().nullable(),
})

const trendSchema = z.array(
  z.object({
    date: z.string(),
    average: z.number().nullable(),
    count: z.number().int(),
  })
)

// The reviews of the account's business (step 11.7-r6, owner 2026-11-18). Hidden and flagged reviews are left out.
export const reviewsReportSchema = z.object({
  period: periodSchema,
  allTime: z.object({
    count: z.number().int(),
    average: z.number().nullable(),
  }),
  summary: reviewStatsSchema,
  previous: reviewStatsSchema,
  // 5 stars first.
  stars: z.array(
    z.object({ stars: z.number().int(), count: z.number().int() })
  ),
  trend: trendSchema,
  previousTrend: trendSchema,
})
export type ReviewsReport = z.infer<typeof reviewsReportSchema>
