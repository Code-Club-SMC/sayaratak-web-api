import { useQuery } from "@tanstack/react-query"

import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { analyticsQuery } from "@/features/analytics/queries"
import { listingQueries } from "@/features/listings/queries"
import { countsQuery } from "@/features/notifications/counts-query"
import { useT } from "@/lib/i18n/use-t"

// Four numbers, each a link to the page that explains it. Views and favorites come with their change against the 30 days before (views with a trend line); the active count is the same one the listings table's Active tab shows.
export function OverviewStats() {
  const { t, locale } = useT()
  const analytics = useQuery(analyticsQuery("30d"))
  const active = useQuery(listingQueries.mine({ tab: "active", pageSize: 1 }))
  const counts = useQuery(countsQuery)
  const failed = analytics.isError || active.isError || counts.isError
  if (failed)
    return (
      <SectionError
        message={t("dashboard.overview_stats_error")}
        onRetry={() => {
          void analytics.refetch()
          void active.refetch()
          void counts.refetch()
        }}
      />
    )
  const totals = analytics.data?.totals
  const previous = analytics.data?.previous
  const toReports = {
    to: "/$locale/account/reports",
    params: { locale },
  } as const
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label={t("dashboard.overview_stat_active")}
        value={active.data?.total}
        link={{
          to: "/$locale/account/listings",
          params: { locale },
          search: { tab: "active" },
        }}
      />
      <StatCard
        label={t("dashboard.overview_stat_views")}
        value={totals?.views}
        previous={previous?.views}
        spark={analytics.data?.daily.map((d) => d.views)}
        link={toReports}
      />
      <StatCard
        label={t("dashboard.overview_stat_favorites")}
        value={totals?.favorites}
        previous={previous?.favorites}
        link={toReports}
      />
      <StatCard
        label={t("dashboard.overview_stat_messages")}
        value={counts.data?.unreadMessages}
        link={{ to: "/$locale/account/messages", params: { locale } }}
      />
    </div>
  )
}
