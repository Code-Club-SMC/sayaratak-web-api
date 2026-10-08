import { stripSearchParams } from "@tanstack/react-router"

import { dashboardPage } from "@/features/dashboard/overview-route"
import { dashboardPath } from "@/lib/navigation"
import { AnalyticsPage } from "./components/analytics-page"
import {
  analyticsSearchDefaults,
  analyticsSearchSchema,
  type AnalyticsSearch,
} from "./schemas"

// Route options of `<dashboard>/analytics`, the same for the three business roles.
export const analyticsRoute = (
  role: "dealership" | "workshop" | "mechanic"
) => ({
  validateSearch: analyticsSearchSchema,
  search: {
    middlewares: [stripSearchParams<AnalyticsSearch>(analyticsSearchDefaults)],
  },
  ...dashboardPage(
    `${dashboardPath(role)}/analytics`,
    "dashboard.nav_analytics"
  ),
  component: () => <AnalyticsPage role={role} />,
})
