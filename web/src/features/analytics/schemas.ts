import { z } from "zod"

import { rangeSchema, type Range } from "@sayaratak/shared/schemas/api"
import {
  periodQuerySchema,
  type PeriodQuery,
} from "@sayaratak/shared/schemas/period"

// Overviews: the period lives in the URL; an unknown value falls back to 30 days.
export const analyticsSearchSchema = z.object({ range: rangeSchema })
export type AnalyticsSearch = z.infer<typeof analyticsSearchSchema>
export const analyticsSearchDefaults = { range: "30d" } as const

// Report pages (step 11.7-r1): a preset or custom `from`/`to`, and what to compare with.
export const reportSearchSchema = periodQuerySchema
export type ReportSearch = PeriodQuery
export const reportSearchDefaults = {
  range: "30d",
  compare: "previous",
} as const

// A preset as a full query, for the pages that only offer presets.
export const presetQuery = (range: Range): PeriodQuery => ({
  range,
  compare: "previous",
})
