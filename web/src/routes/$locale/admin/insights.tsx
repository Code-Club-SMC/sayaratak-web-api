import { createFileRoute } from "@tanstack/react-router"

import { insightsRoute } from "@/features/admin-insights/insights-route"

export const Route = createFileRoute("/$locale/admin/insights")(insightsRoute)
