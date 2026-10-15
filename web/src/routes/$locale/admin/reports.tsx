import { createFileRoute, stripSearchParams } from "@tanstack/react-router"

import { reportsSearchSchema } from "@/features/admin/schemas"
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// A later Phase 13 step replaces the component.
export const Route = createFileRoute("/$locale/admin/reports")({
  validateSearch: reportsSearchSchema,
  search: { middlewares: [stripSearchParams({ tab: "open" })] },
  ...dashboardPage("/admin/reports", "dashboard.nav_reports"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_reports" />,
})
