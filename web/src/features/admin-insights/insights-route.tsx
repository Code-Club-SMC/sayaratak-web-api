import { lazyRouteComponent, stripSearchParams } from "@tanstack/react-router"

import { dashboardPage } from "@/features/dashboard/overview-route"
import {
  type InsightsSearch,
  insightsSearchDefaults,
  insightsSearchSchema,
} from "./schemas"

const InsightsPage = lazyRouteComponent(
  () => import("./components/insights-page"),
  "InsightsPage"
)

// Route options of `/admin/insights` (step 11.7-r10).
export const insightsRoute = {
  validateSearch: insightsSearchSchema,
  search: {
    middlewares: [stripSearchParams<InsightsSearch>(insightsSearchDefaults)],
  },
  ...dashboardPage("/admin/insights", "dashboard.nav_insights"),
  component: InsightsPage,
}
