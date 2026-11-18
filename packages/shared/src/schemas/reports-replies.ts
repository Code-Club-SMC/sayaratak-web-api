import { z } from "zod"

import { bilingualSchema, idSchema } from "./fields"
import { periodSchema } from "./period"

// Threads a buyer started inside a window: how many, the median minutes to the first reply and the share answered within 24 h (whole percent).
const replyStatsSchema = z.object({
  threads: z.number().int(),
  medianMinutes: z.number().int().nullable(),
  replyRate: z.number().int().nullable(),
})

export const REPLY_SPEEDS = ["h1", "h4", "h24", "later", "none"] as const

// Responsiveness to buyer messages (step 11.7-r6, owner 2026-11-18). `unanswered` is a snapshot of now: threads whose last message is from the other side.
export const repliesReportSchema = z.object({
  period: periodSchema,
  summary: replyStatsSchema,
  previous: replyStatsSchema,
  speed: z.array(
    z.object({ key: z.enum(REPLY_SPEEDS), count: z.number().int() })
  ),
  unanswered: z.object({
    count: z.number().int(),
    // Ten oldest first.
    items: z.array(
      z.object({
        threadId: idSchema,
        subjectTitle: bilingualSchema,
        waitingSince: z.string(),
      })
    ),
  }),
})
export type RepliesReport = z.infer<typeof repliesReportSchema>
