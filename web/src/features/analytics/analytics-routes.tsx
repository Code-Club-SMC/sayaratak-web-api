import { lazyRouteComponent, stripSearchParams } from "@tanstack/react-router"

import { dashboardPage } from "@/features/dashboard/overview-route"
import { withProps } from "@/lib/lazy-page"
import { dashboardPath } from "@/lib/navigation"
import {
  reportSearchDefaults,
  reportSearchSchema,
  type ReportSearch,
} from "./schemas"

const AnalyticsPage = lazyRouteComponent(
  () => import("./components/analytics-page"),
  "AnalyticsPage"
)

// Route options of `<dashboard>/analytics`, the same for the three business roles.
export const analyticsRoute = (
  role: "dealership" | "workshop" | "mechanic"
) => ({
  validateSearch: reportSearchSchema,
  search: {
    middlewares: [stripSearchParams<ReportSearch>(reportSearchDefaults)],
  },
  ...dashboardPage(
    `${dashboardPath(role)}/analytics`,
    "dashboard.nav_analytics"
  ),
  component: withProps(AnalyticsPage, { role }),
})
