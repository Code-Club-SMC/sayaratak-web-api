import { createFileRoute } from "@tanstack/react-router"

import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// Step 11.4 replaces the component.
export const Route = createFileRoute("/$locale/workshop/services")({
  ...dashboardPage("/workshop/services", "dashboard.nav_services"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_services" />,
})
