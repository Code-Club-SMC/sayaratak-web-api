import { createFileRoute, stripSearchParams } from "@tanstack/react-router"

import { plansSearchSchema } from "@/features/admin/schemas"
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// A later Phase 13 step replaces the component.
export const Route = createFileRoute("/$locale/admin/plans")({
  validateSearch: plansSearchSchema,
  search: { middlewares: [stripSearchParams({ tab: "user" })] },
  ...dashboardPage("/admin/plans", "dashboard.nav_plans"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_plans" />,
})
