import { createFileRoute } from "@tanstack/react-router"

import { reportsRoute } from "@/features/dealer-reports/reports-route"

export const Route = createFileRoute("/$locale/account/reports")(
  reportsRoute("user")
)
