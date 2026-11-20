import { useQuery } from "@tanstack/react-query"

import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { useT } from "@/lib/i18n/use-t"
import { listingsReportQuery } from "../queries"
import type { ReportsSearch } from "../schemas"
import { ListingsReportTable } from "./listings-report-table"
import { StockAgeCard } from "./stock-age-card"

// Snapshot cards (live now, ending within 7 days, median contact rate), days to sell for the period, stock age bands and the per-listing table.
export function ListingsReport({ search }: { search: ReportsSearch }) {
  const { t } = useT()
  const { tab: _tab, ...query } = search
  const report = useQuery(listingsReportQuery(query))
  const { data, isPending } = report
  const summary = data?.summary
  const sell = summary?.daysToSell
  const before = summary?.previousDaysToSell
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error")}
        onRetry={() => void report.refetch()}
      />
    )
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <div className="stat-grid">
        <div className="grid grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("reports.stat_live")}
            value={summary?.live}
            detail={t("reports.now")}
            loading={isPending}
          />
          <StatCard
            label={t("reports.stat_expiring")}
            value={summary?.expiringSoon}
            detail={t("reports.next_7_days")}
            loading={isPending}
          />
          <StatCard
            label={t("reports.stat_days_to_sell")}
            value={sell?.median}
            empty={t("reports.no_sales")}
            detail={
              sell?.count
                ? t("reports.sold_count", { count: sell.count })
                : undefined
            }
            note={
              before?.median != null
                ? t("dashboard.previous_value", {
                    value: t("reports.days", { count: before.median }),
                  })
                : undefined
            }
            loading={isPending}
          />
          <StatCard
            label={t("reports.stat_median_rate")}
            value={summary?.medianRate}
            suffix="%"
            empty={t("reports.rate_not_enough")}
            loading={isPending}
          />
        </div>
      </div>
      <StockAgeCard buckets={summary?.stockAge} loading={isPending} />
      <ListingsReportTable search={search} report={report} />
    </div>
  )
}
