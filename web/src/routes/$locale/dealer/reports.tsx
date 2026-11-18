import {
  createFileRoute,
  lazyRouteComponent,
  stripSearchParams,
} from "@tanstack/react-router"

import { dashboardPage } from "@/features/dashboard/overview-route"
import {
  reportsSearchDefaults,
  reportsSearchSchema,
  type ReportsSearch,
} from "@/features/dealer-reports/schemas"

export const Route = createFileRoute("/$locale/dealer/reports")({
  validateSearch: reportsSearchSchema,
  search: {
    middlewares: [stripSearchParams<ReportsSearch>(reportsSearchDefaults)],
  },
  ...dashboardPage("/dealer/reports", "dashboard.nav_business_reports"),
  component: lazyRouteComponent(
    () => import("@/features/dealer-reports/components/reports-page"),
    "ReportsPage"
  ),
})
