import { useQuery } from "@tanstack/react-query"

import { adminQueries } from "@/features/admin/queries"
import { OverviewHeader } from "@/features/dashboard/components/overview-header"
import { ActivityFeed } from "./activity-feed"
import { AdminStatGrid } from "./admin-stat-grid"
import { QueuesCard } from "./queues-card"

// The admin's first screen: site totals (revenue over the last 30 days), the four queues and the latest events. Charts and the contact heatmap live on Insights (step 11.7-r14).
export function AdminOverviewPage() {
  const stats = useQuery(adminQueries.stats())
  return (
    <div className="flex flex-col gap-6">
      <OverviewHeader
        reports="/$locale/admin/insights"
        label="dashboard.see_insights"
      />
      <AdminStatGrid stats={stats} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <QueuesCard />
        <ActivityFeed />
      </div>
    </div>
  )
}
