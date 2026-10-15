import { createFileRoute, stripSearchParams } from "@tanstack/react-router"

import { verificationsSearchSchema } from "@/features/admin/schemas"
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// A later Phase 13 step replaces the component.
export const Route = createFileRoute("/$locale/admin/verifications")({
  validateSearch: verificationsSearchSchema,
  search: { middlewares: [stripSearchParams({ tab: "pending" })] },
  ...dashboardPage("/admin/verifications", "dashboard.nav_verifications"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_verifications" />,
})
