import { okSchema } from "@sayaratak/shared/schemas/api"
import { listingAnalyticsSchema } from "@sayaratak/shared/schemas/api"
import { eventInputSchema } from "@sayaratak/shared/schemas/inputs"
import { periodQuerySchema } from "@sayaratak/shared/schemas/period"
import {
  listingsReportQuerySchema,
  listingsReportSchema,
} from "@sayaratak/shared/schemas/reports"
import {
  pricePositionSchema,
  priceReportQuerySchema,
  priceReportSchema,
} from "@sayaratak/shared/schemas/reports-price"
import { analyticsSchema } from "@sayaratak/shared/schemas/responses"
import { Hono } from "hono"

import { rateLimit } from "~/shared/http/rate-limit"
import { validate } from "~/shared/http/validate"
import { spec } from "~/shared/openapi/registry"
import { requireUser } from "~/modules/auth/auth.middleware"

import { getMyAnalytics } from "./analytics.me.service"
import { getListingPrice, getPriceReport } from "./analytics.price.service"
import { reportTabs } from "./analytics.report-tabs"
import { getListingsReport } from "./analytics.reports.service"
import { getListingAnalytics, recordEvent } from "./analytics.service"

// An unknown or missing `range` reads as 30 days, as the mock; valid `from`/`to` (Khartoum minutes) win over it.
const rangeQuery = periodQuerySchema

export const analyticsRoutes = new Hono()

analyticsRoutes.post(
  "/events",
  spec({
    summary:
      "Count one view, call, WhatsApp tap, share or banner view or click; always answers ok, ids that match nothing are ignored",
    access: "public",
    responses: { 200: okSchema },
    errors: ["too_many_attempts"],
  }),
  rateLimit("events"),
  validate.json(eventInputSchema),
  async (c) => {
    await recordEvent(c.req.valid("json"))
    return c.json({ ok: true as const })
  }
)

analyticsRoutes.get(
  "/me/analytics",
  spec({
    summary:
      "Dashboard numbers for the last 7, 30 or 90 whole Khartoum days or a custom `from`/`to`: a seller's listings, a business owner's profile, everything for an admin; `previous` is the period just before or (`compare=year`) a year earlier",
    access: "user",
    responses: { 200: analyticsSchema },
    errors: ["unauthenticated", "banned"],
  }),
  requireUser,
  validate.query(rangeQuery),
  async (c) => {
    const analytics = await getMyAnalytics(c.get("user"), c.req.valid("query"))
    return c.json(analytics)
  }
)

analyticsRoutes.get(
  "/listings/:id/analytics",
  spec({
    summary:
      "One listing's views, calls, WhatsApp taps and shares per bucket and in total for a preset or custom period (owner or admin)",
    access: "user",
    responses: { 200: listingAnalyticsSchema },
    errors: ["unauthenticated", "banned", "forbidden", "not_found"],
  }),
  requireUser,
  validate.query(rangeQuery),
  async (c) => {
    const analytics = await getListingAnalytics(c.get("user"), {
      id: c.req.param("id"),
      query: c.req.valid("query"),
    })
    return c.json(analytics)
  }
)

analyticsRoutes.get(
  "/me/reports/listings",
  spec({
    summary:
      "The account's approved listings for a preset or custom period: views, calls, WhatsApp taps and messages per listing, contact rate, weak-listing flags, stock age, expiring in 7 days and days to sell; filtered, sorted and paged (20)",
    access: "user",
    responses: { 200: listingsReportSchema },
    errors: ["unauthenticated", "banned"],
  }),
  requireUser,
  validate.query(listingsReportQuerySchema),
  async (c) => {
    const report = await getListingsReport(c.get("user"), c.req.valid("query"))
    return c.json(report)
  }
)

// Steps 11.7-r6 to r9: the other report tabs, each for a preset or custom period.
for (const [name, summary, schema, read] of reportTabs)
  analyticsRoutes.get(
    `/me/reports/${name}`,
    spec({
      summary,
      access: "user",
      responses: { 200: schema },
      errors: ["unauthenticated", "banned"],
    }),
    requireUser,
    validate.query(rangeQuery),
    async (c) => c.json(await read(c.get("user"), c.req.valid("query")))
  )

// Step 11.7-r7: price position, a snapshot of now (no period).
analyticsRoutes.get(
  "/me/reports/price",
  spec({
    summary:
      "The account's live listings against the median price of the same car now (make, model, year within 1, sale or rent, new or used, rent period; live or sold in the last 90 days, all Sudan): below, around or above market (10%), hidden under 5 comparables; filtered by band and paged (20)",
    access: "user",
    responses: { 200: priceReportSchema },
    errors: ["unauthenticated", "banned"],
  }),
  requireUser,
  validate.query(priceReportQuerySchema),
  async (c) => c.json(await getPriceReport(c.get("user"), c.req.valid("query")))
)

analyticsRoutes.get(
  "/listings/:id/price",
  spec({
    summary:
      "One listing's price against the median price of the same car now, as the Price report places it (owner or admin, any state)",
    access: "user",
    responses: { 200: pricePositionSchema },
    errors: ["unauthenticated", "banned", "forbidden", "not_found"],
  }),
  requireUser,
  async (c) => c.json(await getListingPrice(c.get("user"), c.req.param("id")))
)
