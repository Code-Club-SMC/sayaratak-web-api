import { createFileRoute } from "@tanstack/react-router"

import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// A later Phase 13 step replaces the component.
export const Route = createFileRoute("/$locale/admin/moderation")({
  ...dashboardPage("/admin/moderation", "dashboard.nav_review_queue"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_review_queue" />,
})
