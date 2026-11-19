import { useQuery } from "@tanstack/react-query"

import { BarChartCard } from "@/components/app/bar-chart-card"
import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { dayRows, reportChart } from "@/features/analytics/chart-props"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import { alertsReportQuery } from "../queries"
import { AlertsTable } from "./alerts-table"

// Saved-search alerts: how many new listings of others fit the account's saved searches in the period, per bucket and per search (step 11.7-r9).
export function AlertsReport({ query }: { query: PeriodQuery }) {
  const { t } = useT()
  const report = useQuery(alertsReportQuery(query))
  const { data, isPending } = report
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label={t("reports.stat_saved_searches")}
          value={data?.searches}
          note={
            data
              ? t("reports.alerts_on_count", { count: data.alertsOn })
              : undefined
          }
          loading={isPending}
        />
        <StatCard
          label={t("reports.stat_matches")}
          value={data?.matches}
          previous={data?.previous}
          compare={data?.period.compare}
          loading={isPending}
        />
      </div>
      <BarChartCard
        title={t("reports.chart_matches")}
        series={[{ key: "matches", label: t("reports.series_matches") }]}
        csvName={t("reports.tab_alerts")}
        loading={isPending}
        {...reportChart({
          t,
          period: data?.period,
          rows: dayRows(data?.series),
          previous: dayRows(data?.previousSeries),
        })}
      />
      <AlertsTable rows={data?.rows} loading={isPending} />
    </div>
  )
}
