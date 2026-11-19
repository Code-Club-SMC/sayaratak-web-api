import { z } from "zod"

import { periodSchema } from "./period"

export const RANK_METRICS = [
  "views",
  "contacts",
  "rating",
  "replyRate",
] as const
export type RankMetric = (typeof RANK_METRICS)[number]

// One metric of the city rank (step 11.7-r8, owner 2026-11-19): the account's value and the share of the other ranked peers it beats.
// "ok": ranked; "few": under 5 peers have a value; "none": the account has no value (rating under 3 reviews, no decided inquiry, no profile).
const rankRowSchema = z.object({
  key: z.enum(RANK_METRICS),
  state: z.enum(["ok", "few", "none"]),
  // Views and contacts are counts, rating one decimal, reply rate a whole percent.
  value: z.number().nullable(),
  // Peers with a value, the account included.
  ranked: z.number().int(),
  // Whole percent of the other ranked peers with a strictly lower value; null unless "ok".
  percentile: z.number().int().nullable(),
})
export type RankRow = z.infer<typeof rankRowSchema>

// Aggregate only: no peer names or values leave the server.
export const rankReportSchema = z.object({
  period: periodSchema,
  // "city": 5+ listed businesses of the account's kind in its city; else "country" (all Sudan).
  scope: z.enum(["city", "country"]),
  cityId: z.string().nullable(),
  // Businesses compared, the account included.
  peers: z.number().int(),
  metrics: z.array(rankRowSchema),
})
export type RankReport = z.infer<typeof rankReportSchema>
