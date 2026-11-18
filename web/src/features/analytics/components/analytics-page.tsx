import { useQuery } from "@tanstack/react-query"

import { AreaChartCard } from "@/components/app/area-chart-card"
import { BarChartCard } from "@/components/app/bar-chart-card"
import { ContactHeatmap } from "@/components/app/contact-heatmap"
import { PageHeader } from "@/components/app/page-header"
import { PeriodControl } from "@/components/app/period-control"
import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { usePageTitle } from "@/features/dashboard/components/page-title"
import { useT } from "@/lib/i18n/use-t"
import { usePeriodSearch } from "../hooks"
import { analyticsQuery } from "../queries"
import { dayRows, reportChart } from "../chart-props"
import { StatRow } from "./stat-row"
import { TopListingsTable } from "./top-listings-table"

// Counts from the public pages for a period (preset or custom range with times): five cards with the change against the compare window, views over time, contacts per bucket, the weekday x hour contact heatmap, and (dealerships) the ten listings with the most views. The period lives in the URL.
export function AnalyticsPage({
  role,
}: {
  role: "dealership" | "workshop" | "mechanic"
}) {
  const { t } = useT()
  const title = t("dashboard.nav_analytics")
  usePageTitle(title)
  const { query, setQuery } = usePeriodSearch()
  const { data, isPending, isError, refetch } = useQuery(analyticsQuery(query))
  const chart = {
    ...reportChart({
      t,
      period: data?.period,
      rows: dayRows(data?.daily),
      previous: dayRows(data?.previousDaily),
      events: true,
    }),
    loading: isPending,
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title}>
        <PeriodControl value={query} onChange={setQuery} />
      </PageHeader>
      <PeriodNote period={data?.period} hourlySince={data?.hourlySince} />
      {isError ? (
        <SectionError
          message={t("analytics.load_error")}
          onRetry={() => void refetch()}
        />
      ) : (
        <>
          <StatRow role={role} data={data} loading={isPending} />
          <AreaChartCard
            title={t(
              role === "dealership"
                ? "analytics.chart_views"
                : "analytics.chart_profile_views"
            )}
            series={[{ key: "views", label: t("analytics.series_views") }]}
            csvName={t("analytics.chart_views")}
            {...chart}
          />
          <BarChartCard
            title={t("analytics.chart_contacts")}
            series={[
              { key: "calls", label: t("analytics.series_calls") },
              { key: "whatsapp", label: t("analytics.series_whatsapp") },
              { key: "messages", label: t("analytics.series_messages") },
            ]}
            stacked
            {...chart}
          />
          <ContactHeatmap
            cells={data?.contactHours}
            since={data?.hourlySince}
            from={data?.period.from}
            loading={isPending}
          />
          {role === "dealership" && (
            <TopListingsTable rows={data?.topListings} loading={isPending} />
          )}
        </>
      )}
    </div>
  )
}
