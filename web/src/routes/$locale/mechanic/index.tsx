import { createFileRoute } from "@tanstack/react-router"

import { overviewSearchSchema } from "@/features/account-overview/schemas"
import { dashboardPage } from "@/features/dashboard/overview-route"
import { WorkshopOverviewPage } from "@/features/workshop-overview/components/workshop-overview-page"

export const Route = createFileRoute("/$locale/mechanic/")({
  validateSearch: overviewSearchSchema,
  ...dashboardPage("/mechanic", "dashboard.nav_overview"),
  component: () => <WorkshopOverviewPage role="mechanic" />,
})
