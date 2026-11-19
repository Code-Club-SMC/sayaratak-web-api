import { z } from "zod"

import { periodQuerySchema } from "@sayaratak/shared/schemas/period"

// Admin Insights (step 11.7-r10): the tab and the period live in the URL. Revenue joined in r11, Trust & safety in r12a; Ads and Search demand join in r12b and r13.
export const insightsTabs = [
  "marketplace",
  "users",
  "revenue",
  "trust",
] as const
export type InsightsTab = (typeof insightsTabs)[number]
export const insightsSearchSchema = periodQuerySchema.extend({
  tab: z.enum(insightsTabs).catch("marketplace"),
})
export type InsightsSearch = z.infer<typeof insightsSearchSchema>
export const insightsSearchDefaults = {
  tab: "marketplace",
  range: "30d",
  compare: "previous",
} as const
