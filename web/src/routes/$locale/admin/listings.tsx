import { createFileRoute, stripSearchParams } from "@tanstack/react-router"

import { adminListingsSearchSchema } from "@/features/admin/schemas"
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// A later Phase 13 step replaces the component.
export const Route = createFileRoute("/$locale/admin/listings")({
  validateSearch: adminListingsSearchSchema,
  search: { middlewares: [stripSearchParams({ tab: "all" })] },
  ...dashboardPage("/admin/listings", "dashboard.nav_all_listings"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_all_listings" />,
})
