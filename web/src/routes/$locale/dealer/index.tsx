import { createFileRoute } from "@tanstack/react-router"

import { overviewSearchSchema } from "@/features/account-overview/schemas"
import { dashboardPage } from "@/features/dashboard/overview-route"
import { DealerOverviewPage } from "@/features/dealer-overview/components/dealer-overview-page"

export const Route = createFileRoute("/$locale/dealer/")({
  validateSearch: overviewSearchSchema,
  ...dashboardPage("/dealer", "dashboard.nav_overview"),
  component: DealerOverviewPage,
})
