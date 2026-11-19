import { lazyRouteComponent, stripSearchParams } from "@tanstack/react-router"

import { dashboardPage } from "@/features/dashboard/overview-route"
import { withProps } from "@/lib/lazy-page"
import { dashboardPath } from "@/lib/navigation"
import {
  type ReportsRole,
  type ReportsSearch,
  reportsSearchDefaults,
  reportsSearchSchema,
} from "./schemas"

const ReportsPage = lazyRouteComponent(
  () => import("./components/reports-page"),
  "ReportsPage"
)

// Route options of `<dashboard>/reports` for the three business roles (steps 11.7-r5 and r8).
export const reportsRoute = (role: ReportsRole) => ({
  validateSearch: reportsSearchSchema,
  search: {
    middlewares: [stripSearchParams<ReportsSearch>(reportsSearchDefaults)],
  },
  ...dashboardPage(
    `${dashboardPath(role)}/reports`,
    "dashboard.nav_business_reports"
  ),
  component: withProps(ReportsPage, { role }),
})
