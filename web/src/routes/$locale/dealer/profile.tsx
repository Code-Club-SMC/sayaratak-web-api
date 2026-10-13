import { createFileRoute } from "@tanstack/react-router"

import { dashboardPage } from "@/features/dashboard/overview-route"
import { DealerProfilePage } from "@/features/dealer-profile/components/dealer-profile-page"

export const Route = createFileRoute("/$locale/dealer/profile")({
  ...dashboardPage("/dealer/profile", "dashboard.nav_profile"),
  component: DealerProfilePage,
})
