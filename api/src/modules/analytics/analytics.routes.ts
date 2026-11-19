import { okSchema } from "@sayaratak/shared/schemas/api"
import { listingAnalyticsSchema } from "@sayaratak/shared/schemas/api"
import { eventInputSchema } from "@sayaratak/shared/schemas/inputs"
import { periodQuerySchema } from "@sayaratak/shared/schemas/period"
import {
  listingsReportQuerySchema,
  listingsReportSchema,
} from "@sayaratak/shared/schemas/reports"
import { demandReportSchema } from "@sayaratak/shared/schemas/reports-demand"
import {
  pricePositionSchema,
  priceReportQuerySchema,
  priceReportSchema,
} from "@sayaratak/shared/schemas/reports-price"
import { rankReportSchema } from "@sayaratak/shared/schemas/reports-rank"
import { promotionsReportSchema } from "@sayaratak/shared/schemas/reports-promotions"
import { repliesReportSchema } from "@sayaratak/shared/schemas/reports-replies"
import { reviewsReportSchema } from "@sayaratak/shared/schemas/reports-reviews"
import { analyticsSchema } from "@sayaratak/shared/schemas/responses"
import { Hono } from "hono"

import { rateLimit } from "~/shared/http/rate-limit"
import { validate } from "~/shared/http/validate"
import { spec } from "~/shared/openapi/registry"
import { requireUser } from "~/modules/auth/auth.middleware"

import { getMyAnalytics } from "./analytics.me.service"
import {
  getDemandReport,
  getRepliesReport,
  getReviewsReport,
} from "./analytics.activity-reports.service"
import { getListingPrice, getPriceReport } from "./analytics.price.service"
import { getRankReport } from "./analytics.rank.service"
import { getPromotionsReport } from "./analytics.promotions-report.service"
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

// Step 11.7-r6: the other report tabs, each for a preset or custom period.
const reports = [
  [
    "promotions",
    "Each promotion of the account's listings that ran in the period, against the same length before it (a bump counts 3 days): views, contacts, extra contacts and cost per extra contact; and the paid banner campaigns with views, clicks and click rate per bucket",
    promotionsReportSchema,
    getPromotionsReport,
  ],
  [
    "demand",
    "Share of market views per make and model in the account's city (all Sudan without a city or under 50 live listings) against the share of the account's live stock; under 5 market listings fold into Other",
    demandReportSchema,
    getDemandReport,
  ],
  [
    "replies",
    "Buyer threads started in the period: median minutes to the first reply, share answered within 24 hours, reply speed bands; and the threads waiting for a reply now",
    repliesReportSchema,
    getRepliesReport,
  ],
  [
    "reviews",
    "Visible reviews of the account's business: average stars per bucket, star breakdown, reply rate and median reply hours for the period and the compare window, and the all-time average",
    reviewsReportSchema,
    getReviewsReport,
  ],
  [
    "rank",
    "Where the account's business stands among listed businesses of its kind in its city (all Sudan under 5 there) for views, contacts, rating (3+ reviews) and 24 h reply rate: the share of the other ranked peers it beats, shown with 5+ ranked; aggregate only",
    rankReportSchema,
    getRankReport,
  ],
] as const

for (const [name, summary, schema, read] of reports)
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
