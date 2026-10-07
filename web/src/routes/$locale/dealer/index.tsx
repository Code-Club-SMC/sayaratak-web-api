import { createFileRoute } from "@tanstack/react-router"

import { overviewRoute } from "@/features/dashboard/overview-route"

export const Route = createFileRoute("/$locale/dealer/")(
  overviewRoute("/dealer")
)
