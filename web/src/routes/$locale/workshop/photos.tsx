import { createFileRoute } from "@tanstack/react-router"

import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// Step 11.5 replaces the component.
export const Route = createFileRoute("/$locale/workshop/photos")({
  ...dashboardPage("/workshop/photos", "dashboard.nav_photos"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_photos" />,
})
