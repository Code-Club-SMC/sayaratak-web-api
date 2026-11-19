import { useQuery } from "@tanstack/react-query"

import { AreaChartCard } from "@/components/app/area-chart-card"
import { BarChartCard } from "@/components/app/bar-chart-card"
import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { dayRows, reportChart } from "@/features/analytics/chart-props"
import { formatNumber, formatPrice } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import { SPEND_TYPES } from "@sayaratak/shared/schemas/reports-spending"
import { revenueInsightsQuery } from "../queries"
import { ExpiringTable } from "./expiring-table"
import { PlanRevenueTable } from "./plan-revenue-table"

// Platform money (step 11.7-r11): approved receipts by the day an admin approved them, split by item type and plan, receipt outcomes and review time, paid plans running and renewed, the average per paying business (personal accounts apart) and paid plans ending in 30 days.
export function RevenueInsights({ query }: { query: PeriodQuery }) {
  const { t, locale } = useT()
  const report = useQuery(revenueInsightsQuery(query))
  const { data, isPending } = report
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  const compare = data?.period.compare
  const unit = formatPrice(0, locale).unit
  const num = (n: number) => formatNumber(n, locale)
  const hours = (n?: number | null) =>
    n == null ? undefined : t("reports.hours", { count: n })
  const subs = data?.subscriptions
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <p className="text-caption text-muted-foreground">
        {t("reports.revenue_day_note")}
      </p>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label={t("reports.revenue_stat_total")}
          value={data?.revenue.amount}
          previous={data?.previous.amount}
          compare={compare}
          detail={unit}
          note={data && t("reports.receipts", { count: data.revenue.count })}
          loading={isPending}
        />
        <StatCard
          label={t("reports.revenue_stat_business")}
          value={data?.business.average}
          previous={data?.business.previousAverage ?? undefined}
          compare={compare}
          detail={unit}
          empty={t("reports.revenue_business_empty")}
          note={
            data &&
            t("reports.revenue_business_payers", {
              value: num(data.business.payers),
            })
          }
          loading={isPending}
        />
        <StatCard
          label={t("reports.revenue_stat_personal")}
          value={data?.personal.amount}
          detail={unit}
          note={
            data &&
            t("reports.revenue_personal_payers", {
              value: num(data.personal.payers),
            })
          }
          loading={isPending}
        />
        <StatCard
          label={t("reports.revenue_stat_renewal")}
          value={data?.renewal.rate}
          previous={data?.renewal.previous ?? undefined}
          compare={compare}
          suffix="%"
          empty={t("reports.revenue_renewal_empty")}
          note={
            data?.renewal.due
              ? t("reports.revenue_renewal_base", {
                  renewed: num(data.renewal.renewed),
                  due: num(data.renewal.due),
                })
              : undefined
          }
          loading={isPending}
        />
        <StatCard
          label={t("reports.revenue_stat_active")}
          value={subs?.activeNow}
          detail={t("reports.now")}
          note={
            subs &&
            t("reports.revenue_started", { value: num(subs.started.count) })
          }
          loading={isPending}
        />
        <StatCard
          label={t("reports.revenue_stat_pending")}
          value={data?.pending.amount}
          detail={unit}
          note={
            data &&
            [
              t("reports.receipts", { count: data.pending.count }),
              data.pending.oldestHours !== null &&
                t("reports.revenue_oldest", {
                  value: hours(data.pending.oldestHours),
                }),
            ]
              .filter(Boolean)
              .join(" · ")
          }
          loading={isPending}
        />
        <StatCard
          label={t("reports.revenue_stat_rejected")}
          value={data?.outcomes.rejected}
          previous={data?.outcomes.previousRejected}
          compare={compare}
          note={
            data &&
            t("reports.revenue_approved_count", {
              value: num(data.outcomes.approved),
            })
          }
          loading={isPending}
        />
        <StatCard
          label={t("reports.insights_stat_review")}
          value={data?.reviewHours.median}
          display={hours(data?.reviewHours.median)}
          empty={t("reports.insights_review_empty")}
          note={
            data?.reviewHours.previous != null
              ? t("dashboard.previous_value", {
                  value: hours(data.reviewHours.previous),
                })
              : undefined
          }
          loading={isPending}
        />
      </div>
      <BarChartCard
        title={t("reports.revenue_chart", { unit })}
        series={SPEND_TYPES.map((type) => ({
          key: type,
          label: t(`reports.spend_type_${type}`),
        }))}
        stacked
        csvName={t("reports.tab_revenue")}
        loading={isPending}
        {...reportChart({
          t,
          period: data?.period,
          rows: dayRows(data?.series),
          previous: dayRows(data?.previousSeries),
        })}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <AreaChartCard
          title={t("reports.revenue_chart_active")}
          series={[{ key: "active", label: t("reports.revenue_stat_active") }]}
          csvName={t("reports.revenue_chart_active")}
          loading={isPending}
          {...reportChart({
            t,
            period: data?.period,
            rows: dayRows(
              subs?.series.map((p) => ({ date: p.date, active: p.active }))
            ),
            previous: dayRows(
              subs?.previousSeries.map((p) => ({
                date: p.date,
                active: p.active,
              }))
            ),
          })}
        />
        <PlanRevenueTable rows={data?.byPlan} loading={isPending} />
      </div>
      <ExpiringTable rows={data?.expiring} loading={isPending} />
    </div>
  )
}
