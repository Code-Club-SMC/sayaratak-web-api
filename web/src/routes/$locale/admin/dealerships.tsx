import { createFileRoute } from "@tanstack/react-router"

import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// A later Phase 13 step replaces the component.
export const Route = createFileRoute("/$locale/admin/dealerships")({
  ...dashboardPage("/admin/dealerships", "dashboard.nav_dealerships"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_dealerships" />,
})
