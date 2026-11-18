import { z } from "zod"

import { idSchema, pageOf } from "./fields"
import { intentSchema } from "./listing"

// Price position (step 11.7-r7, owner 2026-11-18): a listing's price against the middle price of the same car.
export const priceBandSchema = z.enum(["below", "around", "above"])
export type PriceBand = z.infer<typeof priceBandSchema>

// "ok": compared; "few": under 5 comparables; "none": cannot be compared (a part, no make/model/year, a hand-typed make or model, no price).
export const pricePositionSchema = z.object({
  state: z.enum(["ok", "few", "none"]),
  comparables: z.number().int(),
  // Whole SDG; null unless `state` is "ok". `low`/`high` bound the middle half of the comparables.
  median: z.number().int().nullable(),
  low: z.number().int().nullable(),
  high: z.number().int().nullable(),
  // Whole percent above (+) or below (-) the median.
  gapPct: z.number().int().nullable(),
  band: priceBandSchema.nullable(),
})
export type PricePosition = z.infer<typeof pricePositionSchema>

// The Price tab filter: a band, or the live listings without one.
export const priceFilterSchema = z.enum([
  "all",
  ...priceBandSchema.options,
  "unknown",
])
export type PriceFilter = z.infer<typeof priceFilterSchema>

export const priceReportQuerySchema = z.object({
  band: priceFilterSchema.catch("all"),
  page: z.coerce.number().int().min(1).catch(1),
})
export type PriceReportQuery = z.infer<typeof priceReportQuerySchema>

const priceReportRowSchema = z.object({
  id: idSchema,
  slug: z.string(),
  title: z.string(),
  coverUrl: z.string().nullable(),
  price: z.number().int(),
  intent: intentSchema,
  rentPeriod: z.enum(["day", "week", "month"]).nullable(),
  position: pricePositionSchema,
})
export type PriceReportRow = z.infer<typeof priceReportRowSchema>

// The account's live listings now (not a period); `summary` ignores the filter.
export const priceReportSchema = z.object({
  summary: z.object({
    live: z.number().int(),
    below: z.number().int(),
    around: z.number().int(),
    above: z.number().int(),
    unknown: z.number().int(),
  }),
  rows: pageOf(priceReportRowSchema),
})
export type PriceReport = z.infer<typeof priceReportSchema>
