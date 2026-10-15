import { createFileRoute, stripSearchParams } from "@tanstack/react-router"

import { paymentsSearchSchema } from "@/features/admin/schemas"
import { PlaceholderPage } from "@/features/dashboard/components/placeholder-page"
import { dashboardPage } from "@/features/dashboard/overview-route"

// A later Phase 13 step replaces the component.
export const Route = createFileRoute("/$locale/admin/payments")({
  validateSearch: paymentsSearchSchema,
  search: { middlewares: [stripSearchParams({ tab: "pending" })] },
  ...dashboardPage("/admin/payments", "dashboard.nav_payments"),
  component: () => <PlaceholderPage titleKey="dashboard.nav_payments" />,
})
