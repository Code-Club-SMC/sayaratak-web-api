import { createFileRoute } from "@tanstack/react-router"

import { AdminOverviewPage } from "@/features/admin-overview/components/admin-overview-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

export const Route = createFileRoute("/$locale/admin/")({
  ...dashboardPage("/admin", "dashboard.nav_overview"),
  component: AdminOverviewPage,
})
