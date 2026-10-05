import { createFileRoute, notFound } from "@tanstack/react-router"

import { NotFound } from "@/components/app/not-found"
import { requireRole } from "@/features/auth/guards"

// Development-only demo for the step 3.3 guards (admin only). Production returns 404. Remove in step 8.1, when the dashboards use the guards.
export const Route = createFileRoute("/$locale/_public/dev/guarded")({
  beforeLoad: (ctx) => {
    if (!import.meta.env.DEV) throw notFound()
    requireRole("admin")(ctx)
  },
  notFoundComponent: NotFound,
  component: () => (
    <h1 className="py-12 text-page font-semibold">Admin only</h1>
  ),
})
