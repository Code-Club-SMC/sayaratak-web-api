import { z } from "zod"

import { listingsReportQuerySchema } from "@sayaratak/shared/schemas/reports"

// The dealer's Reports page (step 11.7-r5): the tab, the period and the Listings filter, sort and page live in the URL.
export const reportsTabs = ["performance", "listings"] as const
export const reportsSearchSchema = listingsReportQuerySchema.extend({
  tab: z.enum(reportsTabs).catch("performance"),
})
export type ReportsSearch = z.infer<typeof reportsSearchSchema>
export const reportsSearchDefaults = {
  tab: "performance",
  range: "30d",
  compare: "previous",
  filter: "all",
  sort: "views_desc",
  page: 1,
} as const

// The search as a query string without its defaults, for page links.
export function searchString(search: ReportsSearch) {
  const defaults: Record<string, unknown> = reportsSearchDefaults
  return new URLSearchParams(
    Object.entries(search).flatMap(([key, value]) =>
      defaults[key] === value ? [] : [[key, String(value)]]
    )
  ).toString()
}
