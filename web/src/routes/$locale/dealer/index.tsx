import { createFileRoute, stripSearchParams } from "@tanstack/react-router"

import {
  analyticsSearchDefaults,
  analyticsSearchSchema,
  type AnalyticsSearch,
} from "@/features/analytics/schemas"
import { dashboardPage } from "@/features/dashboard/overview-route"
import { DealerOverviewPage } from "@/features/dealer-overview/components/dealer-overview-page"

export const Route = createFileRoute("/$locale/dealer/")({
  validateSearch: analyticsSearchSchema,
  search: {
    middlewares: [stripSearchParams<AnalyticsSearch>(analyticsSearchDefaults)],
  },
  ...dashboardPage("/dealer", "dashboard.nav_overview"),
  component: DealerOverviewPage,
})
