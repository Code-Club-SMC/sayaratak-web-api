import { z } from "zod"

import { reportSchema } from "./admin"
import { rejectionCodeSchema } from "./listing"
import { periodSchema } from "./period"

// Admin Insights Trust & safety tab (step 11.7-r12a, owner 2026-11-19). Decisions count on the day an admin made them (`decidedAt`); a listing counts by its state now, so one rejected and later approved counts as approved.

const int = z.number().int()
// Whole hours; null when nothing was decided.
const hoursSchema = z.object({
  median: int.nullable(),
  previous: int.nullable(),
})
const countSchema = z.object({ count: int, previous: int })
// What waits now; `oldestHours` is null when nothing waits.
const waitingSchema = z.object({ count: int, oldestHours: int.nullable() })

export const QUEUE_AGES = [
  "under_6h",
  "under_24h",
  "under_3d",
  "over_3d",
] as const

const decisionPoint = z.object({
  date: z.string(),
  approved: int,
  rejected: int,
  removed: int,
})
const reportPoint = z.object({
  date: z.string(),
  received: int,
  resolved: int,
})

export const trustReportSchema = z.object({
  period: periodSchema,
  listings: z.object({
    approved: countSchema,
    rejected: countSchema,
    removed: countSchema,
    // Created to approved or rejected, for those decided in the window.
    waitHours: hoursSchema,
    // Pending now, by how long each has waited since it was sent.
    queue: waitingSchema.extend({
      ages: z.array(z.object({ age: z.enum(QUEUE_AGES), count: int })),
    }),
    // Rejected in the window by the quick reason picked; `unknown` is a rejection from before codes were saved.
    reasons: z.array(
      z.object({
        code: z.union([rejectionCodeSchema, z.literal("unknown")]),
        count: int,
      })
    ),
    series: z.array(decisionPoint),
    previousSeries: z.array(decisionPoint),
  }),
  reports: z.object({
    received: countSchema,
    // Received in the window, most first.
    byReason: z.array(
      z.object({ reason: reportSchema.shape.reason, count: int })
    ),
    // Closed in the window.
    dismissed: countSchema,
    actioned: countSchema,
    // Received to closed, for those closed in the window.
    resolveHours: hoursSchema,
    open: waitingSchema,
    series: z.array(reportPoint),
    previousSeries: z.array(reportPoint),
  }),
  verifications: z.object({
    approved: countSchema,
    rejected: countSchema,
    // Sent to decided, for those decided in the window.
    hours: hoursSchema,
    pending: waitingSchema,
  }),
  // Reviews business owners flagged; `hours` runs from the flag to the admin hiding or keeping it. Flags before r12a have no time and only show in `waiting`.
  reviews: z.object({
    flagged: countSchema,
    hidden: countSchema,
    kept: countSchema,
    hours: hoursSchema,
    waiting: waitingSchema,
  }),
})
export type TrustReport = z.infer<typeof trustReportSchema>
