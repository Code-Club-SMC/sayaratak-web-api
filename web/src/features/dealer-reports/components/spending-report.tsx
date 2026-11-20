import { useQuery } from "@tanstack/react-query"

import { BarChartCard } from "@/components/app/bar-chart-card"
import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { dayRows, reportChart } from "@/features/analytics/chart-props"
import { formatPrice } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import { SPEND_TYPES } from "@sayaratak/shared/schemas/reports-spending"
import { spendingReportQuery } from "../queries"
import { SpendingTable } from "./spending-table"

// Banner campaigns are for businesses, so a personal account never pays for one.
const TYPES = SPEND_TYPES.filter((type) => type !== "campaign")

// What the account paid: approved receipts against the compare window, receipts waiting or rejected, approved SDG per bucket by item type (the chart's table view gives exact sums), and every receipt sent in the period (step 11.7-r9).
export function SpendingReport({ query }: { query: PeriodQuery }) {
  const { t, locale } = useT()
  const report = useQuery(spendingReportQuery(query))
  const { data, isPending } = report
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  const unit = formatPrice(0, locale).unit
  const receipts = (count?: number) =>
    count === undefined ? undefined : t("reports.receipts", { count })
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <div className="stat-grid">
        <div className="grid grid-cols-2 xl:grid-cols-3">
          <StatCard
            label={t("reports.stat_paid")}
            value={data?.approved.amount}
            previous={data?.previous.amount}
            compare={data?.period.compare}
            detail={unit}
            note={receipts(data?.approved.count)}
            loading={isPending}
          />
          <StatCard
            label={t("reports.stat_pending")}
            value={data?.pending.amount}
            detail={unit}
            note={receipts(data?.pending.count)}
            loading={isPending}
          />
          <StatCard
            label={t("reports.stat_rejected")}
            value={data?.rejected.amount}
            detail={unit}
            note={receipts(data?.rejected.count)}
            loading={isPending}
          />
        </div>
      </div>
      <BarChartCard
        title={t("reports.chart_spend", { unit })}
        series={TYPES.map((type) => ({
          key: type,
          label: t(`reports.spend_type_${type}`),
        }))}
        stacked
        csvName={t("reports.tab_spending")}
        loading={isPending}
        {...reportChart({
          t,
          period: data?.period,
          rows: dayRows(data?.series),
          previous: dayRows(data?.previousSeries),
        })}
      />
      <SpendingTable rows={data?.payments} loading={isPending} />
    </div>
  )
}
