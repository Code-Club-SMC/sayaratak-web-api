import { z } from "zod"

import { listingsReportQuerySchema } from "@sayaratak/shared/schemas/reports"
import { priceFilterSchema } from "@sayaratak/shared/schemas/reports-price"

// The dealer's Reports page (steps 11.7-r5 to r7): the tab, the period, the Listings filter and sort, the Price band and the page live in the URL.
export const reportsTabs = [
  "performance",
  "listings",
  "price",
  "promotions",
  "demand",
  "replies",
  "reviews",
] as const
export const reportsSearchSchema = listingsReportQuerySchema.extend({
  tab: z.enum(reportsTabs).catch("performance"),
  band: priceFilterSchema.catch("all"),
})
export type ReportsSearch = z.infer<typeof reportsSearchSchema>
export const reportsSearchDefaults = {
  tab: "performance",
  range: "30d",
  compare: "previous",
  filter: "all",
  band: "all",
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
