import { createFileRoute } from "@tanstack/react-router"

import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// Step 11.3 replaces the component.
export const Route = createFileRoute("/$locale/workshop/profile")({
  ...dashboardPage("/workshop/profile", "dashboard.nav_profile"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_profile" />,
})
