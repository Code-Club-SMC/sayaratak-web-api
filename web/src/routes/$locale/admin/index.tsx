import { createFileRoute, stripSearchParams } from "@tanstack/react-router"

import { AdminOverviewPage } from "@/features/admin-overview/components/admin-overview-page"
import {
  reportSearchDefaults,
  reportSearchSchema,
  type ReportSearch,
} from "@/features/analytics/schemas"
import { dashboardPage } from "@/features/dashboard/overview-route"

export const Route = createFileRoute("/$locale/admin/")({
  validateSearch: reportSearchSchema,
  search: {
    middlewares: [stripSearchParams<ReportSearch>(reportSearchDefaults)],
  },
  ...dashboardPage("/admin", "dashboard.nav_overview"),
  component: AdminOverviewPage,
})
