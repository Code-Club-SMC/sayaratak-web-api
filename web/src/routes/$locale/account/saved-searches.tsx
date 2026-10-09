import { createFileRoute } from "@tanstack/react-router"

import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// Step 9.5 replaces the component.
export const Route = createFileRoute("/$locale/account/saved-searches")({
  ...dashboardPage("/account/saved-searches", "dashboard.nav_saved_searches"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_saved_searches" />,
})
