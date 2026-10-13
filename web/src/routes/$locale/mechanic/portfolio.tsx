import { createFileRoute } from "@tanstack/react-router"

import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// Step 12.4 replaces the component.
export const Route = createFileRoute("/$locale/mechanic/portfolio")({
  ...dashboardPage("/mechanic/portfolio", "dashboard.nav_portfolio"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_portfolio" />,
})
