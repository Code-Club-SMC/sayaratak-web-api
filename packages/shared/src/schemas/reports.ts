import { z } from "zod"

import { idSchema, pageOf } from "./fields"
import { listingStatusSchema } from "./listing"
import { periodQuerySchema, periodSchema } from "./period"

// Weak-listing flags on live listings (step 11.7-r5, owner 2026-11-18).
export const listingFlagSchema = z.enum([
  "no_contacts",
  "low_rate",
  "few_photos",
  "stale",
])
export type ListingFlag = z.infer<typeof listingFlagSchema>

// The Listings report filter: a flag, or the live listings that end within 7 days.
export const listingsFilterSchema = z.enum([
  "all",
  ...listingFlagSchema.options,
  "expiring",
])
export const listingsSortSchema = z.enum([
  "views_desc",
  "views_asc",
  "contacts_desc",
  "contacts_asc",
  "rate_desc",
  "rate_asc",
  "days_desc",
  "days_asc",
  "expires_asc",
  "expires_desc",
])

export const listingsReportQuerySchema = periodQuerySchema.extend({
  filter: listingsFilterSchema.catch("all"),
  sort: listingsSortSchema.catch("views_desc"),
  page: z.coerce.number().int().min(1).catch(1),
})
export type ListingsReportQuery = z.infer<typeof listingsReportQuerySchema>

export const STOCK_AGE_BUCKETS = [
  "d0_15",
  "d16_30",
  "d31_60",
  "d61_90",
  "d90_plus",
] as const

const daysToSellSchema = z.object({
  median: z.number().int().nullable(),
  count: z.number().int(),
})

const listingsReportRowSchema = z.object({
  id: idSchema,
  slug: z.string(),
  title: z.string(),
  coverUrl: z.string().nullable(),
  status: listingStatusSchema,
  // Approved, available or reserved, and not past `expiresAt`.
  live: z.boolean(),
  expiresAt: z.string(),
  // Whole days from approval to now, or to `soldAt` once sold or rented.
  daysLive: z.number().int(),
  views: z.number().int(),
  calls: z.number().int(),
  whatsapp: z.number().int(),
  messages: z.number().int(),
  contacts: z.number().int(),
  // Contacts per view as a whole percent; null without views.
  contactRate: z.number().int().nullable(),
  flags: z.array(listingFlagSchema),
})
export type ListingsReportRow = z.infer<typeof listingsReportRowSchema>

// The approved listings of the account with their period counts, one page at a time; `summary` ignores the filter.
export const listingsReportSchema = z.object({
  period: periodSchema,
  summary: z.object({
    live: z.number().int(),
    expiringSoon: z.number().int(),
    stockAge: z.array(
      z.object({ key: z.enum(STOCK_AGE_BUCKETS), count: z.number().int() })
    ),
    // Median contact rate (whole percent) of live listings with 50+ views; null when none has.
    medianRate: z.number().int().nullable(),
    flagged: z.record(listingFlagSchema, z.number().int()),
    daysToSell: daysToSellSchema,
    previousDaysToSell: daysToSellSchema,
  }),
  rows: pageOf(listingsReportRowSchema),
})
export type ListingsReport = z.infer<typeof listingsReportSchema>
