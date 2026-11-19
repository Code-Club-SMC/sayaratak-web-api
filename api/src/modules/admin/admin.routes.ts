import { periodQuerySchema } from "@sayaratak/shared/schemas/period"
import {
  activitySchema,
  adminSearchSchema,
  adminStatsSchema,
} from "@sayaratak/shared/schemas/responses"
import {
  marketplaceReportSchema,
  usersReportSchema,
} from "@sayaratak/shared/schemas/reports-insights"
import { revenueReportSchema } from "@sayaratak/shared/schemas/reports-revenue"
import { adsReportSchema } from "@sayaratak/shared/schemas/reports-ads"
import { searchReportSchema } from "@sayaratak/shared/schemas/reports-search"
import { trustReportSchema } from "@sayaratak/shared/schemas/reports-trust"
import { Hono } from "hono"

import { validate } from "~/shared/http/validate"
import { spec } from "~/shared/openapi/registry"
import { requireRole } from "~/modules/auth/auth.middleware"

import { getActivity } from "./admin.activity.service"
import { getAdsReport } from "./admin.insights-ads.service"
import { getSearchReport } from "./admin.insights-search.service"
import {
  getMarketplaceReport,
  getRevenueReport,
  getTrustReport,
  getUsersReport,
} from "./admin.insights.service"
import { searchAdmin } from "./admin.search.service"
import { getStats } from "./admin.stats.service"

// An unknown or missing `range` reads as 30 days, as the mock; valid `from`/`to` (Khartoum minutes) win over it.
const rangeQuery = periodQuerySchema

const ADMIN_ERRORS = ["unauthenticated", "banned", "forbidden"] as const

export const adminRoutes = new Hono()

adminRoutes.get(
  "/admin/stats",
  spec({
    summary:
      "Dashboard totals and series for the last 7, 30 or 90 Khartoum days or a custom `from`/`to`, with the compare window (`compare=previous` or `year`)",
    access: "user",
    responses: { 200: adminStatsSchema },
    errors: [...ADMIN_ERRORS],
  }),
  requireRole("admin"),
  validate.query(rangeQuery),
  async (c) => c.json(await getStats(c.req.valid("query")))
)

adminRoutes.get(
  "/admin/activity",
  spec({
    summary: "The ten newest listings, businesses, receipts and reports",
    access: "user",
    responses: { 200: activitySchema },
    errors: [...ADMIN_ERRORS],
  }),
  requireRole("admin"),
  async (c) => c.json(await getActivity())
)

adminRoutes.get(
  "/admin/search",
  spec({
    summary:
      "Up to five hits each for listings, accounts, businesses and payments; `q` is the text to find",
    access: "user",
    responses: { 200: adminSearchSchema },
    errors: [...ADMIN_ERRORS],
  }),
  requireRole("admin"),
  async (c) => c.json(await searchAdmin(c.req.query("q")))
)

// Step 11.7-r10: the admin Insights tabs read for a period.
adminRoutes.get(
  "/admin/insights/marketplace",
  spec({
    summary:
      "Admin Insights Marketplace tab: live stock, listings created and sold against the compare window, share contacted in their first 7 days, median days to sell and hours to review, lifecycle of the period's listings, splits by type, intent and city, and the typical (middle) price per sale make, model and new/used (live or sold in 90 days, 5+ listings, top 50)",
    access: "user",
    responses: { 200: marketplaceReportSchema },
    errors: [...ADMIN_ERRORS],
  }),
  requireRole("admin"),
  validate.query(rangeQuery),
  async (c) => c.json(await getMarketplaceReport(c.req.valid("query")))
)

adminRoutes.get(
  "/admin/insights/users",
  spec({
    summary:
      "Admin Insights Users tab: accounts, sign-ups by bucket, role and method, average daily, 7-day and 30-day active accounts (signed in, recorded from deploy), device mix of active accounts and account languages",
    access: "user",
    responses: { 200: usersReportSchema },
    errors: [...ADMIN_ERRORS],
  }),
  requireRole("admin"),
  validate.query(rangeQuery),
  async (c) => c.json(await getUsersReport(c.req.valid("query")))
)

adminRoutes.get(
  "/admin/insights/revenue",
  spec({
    summary:
      "Admin Insights Revenue tab (step 11.7-r11): approved money by the day an admin approved it, split by item type and plan, receipt outcomes and review time, pending receipts, paid subscriptions per bucket, renewal rate (another paid plan before the end or up to 7 days after), average per paying business with personal accounts apart, and paid plans ending in the next 30 days",
    access: "user",
    responses: { 200: revenueReportSchema },
    errors: [...ADMIN_ERRORS],
  }),
  requireRole("admin"),
  validate.query(rangeQuery),
  async (c) => c.json(await getRevenueReport(c.req.valid("query")))
)

adminRoutes.get(
  "/admin/insights/trust",
  spec({
    summary:
      "Admin Insights Trust & safety tab (step 11.7-r12a): listing decisions by the day an admin made them (a listing counts by its state now), wait from sent to approved or rejected, the pending queue by age, rejections by quick reason, abuse reports by reason with resolve time and what is open, verification turnaround, and flagged reviews (flag to hide or keep)",
    access: "user",
    responses: { 200: trustReportSchema },
    errors: [...ADMIN_ERRORS],
  }),
  requireRole("admin"),
  validate.query(rangeQuery),
  async (c) => c.json(await getTrustReport(c.req.valid("query")))
)

adminRoutes.get(
  "/admin/insights/ads",
  spec({
    summary:
      "Admin Insights Ads tab (step 11.7-r12b): banner views, clicks and click rate per bucket for approved campaigns and admin banners, slot fill per page (slot-days held by approved campaigns / slots x days; admin banners use no slots) and every ad that ran or was seen in the period",
    access: "user",
    responses: { 200: adsReportSchema },
    errors: [...ADMIN_ERRORS],
  }),
  requireRole("admin"),
  validate.query(rangeQuery),
  async (c) => c.json(await getAdsReport(c.req.valid("query")))
)

adminRoutes.get(
  "/admin/insights/search",
  spec({
    summary:
      "Admin Insights Search demand tab (step 11.7-r13): page-1 public searches per day from the search log, top makes, models, cities and part categories, searches per live listing per make, and the filter sets that found nothing",
    access: "user",
    responses: { 200: searchReportSchema },
    errors: [...ADMIN_ERRORS],
  }),
  requireRole("admin"),
  validate.query(rangeQuery),
  async (c) => c.json(await getSearchReport(c.req.valid("query")))
)
