import { createFileRoute } from "@tanstack/react-router"

import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// Step 10.8 replaces the component.
export const Route = createFileRoute("/$locale/dealer/profile")({
  ...dashboardPage("/dealer/profile", "dashboard.nav_profile"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_profile" />,
})
