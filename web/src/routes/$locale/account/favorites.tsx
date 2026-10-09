import { createFileRoute } from "@tanstack/react-router"

import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// Step 9.4 replaces the component.
export const Route = createFileRoute("/$locale/account/favorites")({
  ...dashboardPage("/account/favorites", "dashboard.nav_favorites"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_favorites" />,
})
