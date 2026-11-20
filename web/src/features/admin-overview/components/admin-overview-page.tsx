import { useQuery } from "@tanstack/react-query"

import { AreaChartCard } from "@/components/app/area-chart-card"
import { useT } from "@/lib/i18n/use-t"
import { adminQueries } from "@/features/admin/queries"
import { dayRows, reportChart } from "@/features/analytics/chart-props"
import { OverviewHeader } from "@/features/dashboard/components/overview-header"
import { ActivityFeed } from "./activity-feed"
import { AdminStatGrid } from "./admin-stat-grid"
import { QueuesCard } from "./queues-card"

// The admin's first screen: site totals (revenue over the last 30 days), the four queues, the latest events and new listings per day against the 30 days before (console redesign, 2026-11-20; other charts stay on Insights).
export function AdminOverviewPage() {
  const { t } = useT()
  const stats = useQuery(adminQueries.stats())
  const title = t("dashboard.overview_new_listings")
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
      <AreaChartCard
        title={title}
        series={[{ key: "value", label: title }]}
        loading={stats.isPending}
        error={stats.isError}
        onRetry={() => void stats.refetch()}
        {...reportChart({
          t,
          period: stats.data?.period,
          rows: dayRows(stats.data?.series.newListings),
          previous: dayRows(stats.data?.previousSeries.newListings),
        })}
      />
    </div>
  )
}
