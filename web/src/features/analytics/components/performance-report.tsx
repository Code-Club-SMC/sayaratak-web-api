import { useQuery } from "@tanstack/react-query"

import { AreaChartCard } from "@/components/app/area-chart-card"
import { BarChartCard } from "@/components/app/bar-chart-card"
import { ContactHeatmap } from "@/components/app/contact-heatmap"
import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import { analyticsQuery } from "../queries"
import { dayRows, reportChart } from "../chart-props"
import { StatRow } from "./stat-row"

// Counts from the public pages for a period (preset or custom range with times): five cards with the change against the compare window, views over time, contacts per bucket and the weekday x hour contact heatmap. Per-listing numbers live in the dealer's Listings report.
export function PerformanceReport({
  role,
  query,
}: {
  role: "user" | "dealership" | "workshop" | "mechanic"
  query: PeriodQuery
}) {
  const { t } = useT()
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
              role === "dealership" || role === "user"
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
        </>
      )}
    </div>
  )
}
