import { z } from "zod"

import { listingsReportQuerySchema } from "@sayaratak/shared/schemas/reports"
import { priceFilterSchema } from "@sayaratak/shared/schemas/reports-price"

// The business Reports page (steps 11.7-r5 to r9): the tab, the period, the Listings filter and sort, the Price band and the page live in the URL.
export const reportsTabs = [
  "performance",
  "listings",
  "price",
  "promotions",
  "demand",
  "ads",
  "replies",
  "reviews",
  "rank",
  "spending",
  "alerts",
] as const
export type ReportsTab = (typeof reportsTabs)[number]
export type ReportsRole = "user" | "dealership" | "workshop" | "mechanic"

// Workshops and mechanics have no listings: their tabs are Performance, Ads (banner campaigns), Replies, Reviews and Rank (step 11.7-r8).
// A personal seller has no business: no Demand, Reviews or Rank, but its own Spending and saved-search Alerts (step 11.7-r9).
const roleTabs: Record<ReportsRole, readonly ReportsTab[]> = {
  user: [
    "performance",
    "listings",
    "price",
    "promotions",
    "replies",
    "spending",
    "alerts",
  ],
  dealership: [
    "performance",
    "listings",
    "price",
    "promotions",
    "demand",
    "replies",
    "reviews",
  ],
  workshop: ["performance", "ads", "replies", "reviews", "rank"],
  mechanic: ["performance", "ads", "replies", "reviews", "rank"],
}
export const tabsOf = (role: ReportsRole) => roleTabs[role]
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
