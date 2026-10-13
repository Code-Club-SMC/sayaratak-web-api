import { createFileRoute } from "@tanstack/react-router"

import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// Step 12.3 replaces the component.
export const Route = createFileRoute("/$locale/mechanic/profile")({
  ...dashboardPage("/mechanic/profile", "dashboard.nav_profile"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_profile" />,
})
