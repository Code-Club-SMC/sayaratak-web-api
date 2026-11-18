import { useQuery } from "@tanstack/react-query"

import { AreaChartCard } from "@/components/app/area-chart-card"
import { BarChartCard } from "@/components/app/bar-chart-card"
import { ContactHeatmap } from "@/components/app/contact-heatmap"
import { PageHeader } from "@/components/app/page-header"
import { PeriodControl } from "@/components/app/period-control"
import { PeriodNote } from "@/components/app/period-note"
import { adminQueries } from "@/features/admin/queries"
import { reportChart } from "@/features/analytics/chart-props"
import { usePeriodSearch } from "@/features/analytics/hooks"
import { analyticsQuery } from "@/features/analytics/queries"
import { usePageTitle } from "@/features/dashboard/components/page-title"
import { useT } from "@/lib/i18n/use-t"
import type { AdminStats } from "@sayaratak/shared/schemas/responses"
import { ActivityFeed } from "./activity-feed"
import { AdminStatGrid } from "./admin-stat-grid"
import { QueuesCard } from "./queues-card"

const rows = (points?: AdminStats["series"]["newUsers"]) =>
  points?.map(({ date, value }) => ({ day: date, value }))

// The admin's first screen: site totals, three series for the period with the compare window, the four queues, the site-wide contact heatmap and the latest events. The period lives in the URL.
export function AdminOverviewPage() {
  const { t } = useT()
  const title = t("dashboard.nav_overview")
  usePageTitle(title)
  const { query, setQuery } = usePeriodSearch()
  const stats = useQuery(adminQueries.stats(query))
  // The whole site's contacts (an admin's /me/analytics counts everything), for the heatmap.
  const contacts = useQuery(analyticsQuery(query))
  const chart = (key: keyof AdminStats["series"], label: string) => ({
    title: label,
    series: [{ key: "value", label }],
    ...reportChart({
      t,
      period: stats.data?.period,
      rows: rows(stats.data?.series[key]),
      previous: rows(stats.data?.previousSeries[key]),
    }),
    loading: stats.isPending,
    error: stats.isError,
    onRetry: () => void stats.refetch(),
  })
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title}>
        <PeriodControl value={query} onChange={setQuery} />
      </PageHeader>
      <PeriodNote period={stats.data?.period} />
      <AdminStatGrid stats={stats} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <AreaChartCard
          {...chart("newListings", t("admin.overview_new_listings"))}
        />
        <AreaChartCard {...chart("newUsers", t("admin.overview_new_users"))} />
        <BarChartCard {...chart("revenue", t("admin.overview_revenue_day"))} />
        <QueuesCard />
      </div>
      <ContactHeatmap
        cells={contacts.data?.contactHours}
        since={contacts.data?.hourlySince}
        from={contacts.data?.period.from}
        loading={contacts.isPending}
        error={contacts.isError}
        onRetry={() => void contacts.refetch()}
      />
      <ActivityFeed />
    </div>
  )
}
