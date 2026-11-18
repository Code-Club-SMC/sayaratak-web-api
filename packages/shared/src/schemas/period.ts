import { z } from "zod"

// The presets; an unknown value reads as 30 days. Re-exported from `./api`, where it always lived.
export const rangeSchema = z.enum(["7d", "30d", "90d"]).catch("30d")
export type Range = z.infer<typeof rangeSchema>

// A Khartoum wall-clock minute, "2026-11-01T08:00".
const minute = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)

// Hour buckets arrive with hourly counters (step 11.7-r2).
export const granularitySchema = z.enum(["day", "week", "month"])
export type Granularity = z.infer<typeof granularitySchema>

// What the figures are compared with: the period just before, or the same dates a year earlier.
export const compareSchema = z.enum(["previous", "year"])
export type Compare = z.infer<typeof compareSchema>

// The URL and the API query. `from` and `to` win over `range` when both are valid and `from` is before `to`; anything broken falls back to 30 days against the period before.
export const periodQuerySchema = z.object({
  range: rangeSchema,
  from: minute.optional().catch(undefined),
  to: minute.optional().catch(undefined),
  compare: compareSchema.catch("previous"),
})
export type PeriodQuery = z.infer<typeof periodQuerySchema>

// The resolved period a report answers for. `to` and `compareTo` are exclusive. `rolledUp`: part of the current window is older than the 13 months kept per day, so view and click counters there exist per month only and the buckets are months. `eventsCompared` false: only the compare window reaches those months, so its view, call and WhatsApp numbers are left out of the comparison (owner, 2026-11-18); timestamped counts still compare.
export const periodSchema = z.object({
  from: minute,
  to: minute,
  compareFrom: minute,
  compareTo: minute,
  compare: compareSchema,
  granularity: granularitySchema,
  custom: z.boolean(),
  rolledUp: z.boolean(),
  eventsCompared: z.boolean(),
})
export type Period = z.infer<typeof periodSchema>
