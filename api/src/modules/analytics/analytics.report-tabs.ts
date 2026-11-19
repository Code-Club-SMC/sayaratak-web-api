import { alertsReportSchema } from "@sayaratak/shared/schemas/reports-alerts"
import { demandReportSchema } from "@sayaratak/shared/schemas/reports-demand"
import { promotionsReportSchema } from "@sayaratak/shared/schemas/reports-promotions"
import { rankReportSchema } from "@sayaratak/shared/schemas/reports-rank"
import { repliesReportSchema } from "@sayaratak/shared/schemas/reports-replies"
import { reviewsReportSchema } from "@sayaratak/shared/schemas/reports-reviews"
import { spendingReportSchema } from "@sayaratak/shared/schemas/reports-spending"

import {
  getAlertsReport,
  getSpendingReport,
} from "./analytics.account-reports.service"
import {
  getDemandReport,
  getRepliesReport,
  getReviewsReport,
} from "./analytics.activity-reports.service"
import { getRankReport } from "./analytics.rank.service"
import { getPromotionsReport } from "./analytics.promotions-report.service"

// Steps 11.7-r6 to r9: the report tabs read for a period: path name, OpenAPI summary, response schema, service.
export const reportTabs = [
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
    "spending",
    "The account's Bankak receipts sent in the period: approved total against the compare window, pending and rejected, approved SDG per bucket split by plan, promotion and banner campaign, and each receipt",
    spendingReportSchema,
    getSpendingReport,
  ],
  [
    "alerts",
    "The account's saved searches: listings of others that went public in the period (admin decision, else creation; approved now, sold ones count) and fit each search, against the compare window, and per bucket for all searches",
    alertsReportSchema,
    getAlertsReport,
  ],
  [
    "rank",
    "Where the account's business stands among listed businesses of its kind in its city (all Sudan under 5 there) for views, contacts, rating (3+ reviews) and 24 h reply rate: the share of the other ranked peers it beats, shown with 5+ ranked; aggregate only",
    rankReportSchema,
    getRankReport,
  ],
] as const
