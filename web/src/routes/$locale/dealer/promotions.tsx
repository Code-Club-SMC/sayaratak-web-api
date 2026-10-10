import { createFileRoute } from "@tanstack/react-router"

import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// Step 10.6 replaces the component.
export const Route = createFileRoute("/$locale/dealer/promotions")({
  ...dashboardPage("/dealer/promotions", "dashboard.nav_promotions"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_promotions" />,
})
