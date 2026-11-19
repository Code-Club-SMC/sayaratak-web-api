import { useQuery } from "@tanstack/react-query"

import { BarChartCard } from "@/components/app/bar-chart-card"
import { BarListCard } from "@/components/app/bar-list-card"
import { ContactHeatmap } from "@/components/app/contact-heatmap"
import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { dayRows, reportChart } from "@/features/analytics/chart-props"
import { analyticsQuery } from "@/features/analytics/queries"
import { taxonomyQuery } from "@/features/listings/queries"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import type { MarketplaceReport } from "@sayaratak/shared/schemas/reports-insights"
import { marketplaceInsightsQuery } from "../queries"
import { PriceTable } from "./price-table"

type Split =
  MarketplaceReport["byType"][number] | MarketplaceReport["byCity"][number]

// Platform stock and flow (step 11.7-r10): live, new and sold listings, how many get a contact in their first week, how long selling and review take, the site-wide contact heatmap (moved from the overview in r14), where the period's listings ended up, splits by type, sale/rent and city, and the typical price per model.
export function MarketplaceInsights({ query }: { query: PeriodQuery }) {
  const { t, locale } = useT()
  const report = useQuery(marketplaceInsightsQuery(query))
  const taxonomy = useQuery(taxonomyQuery).data
  // The whole site's contacts (an admin's /me/analytics counts everything), for the heatmap.
  const contacts = useQuery(analyticsQuery(query))
  const { data, isPending } = report
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  const compare = data?.period.compare
  const before = (value: string | undefined) =>
    value ? t("dashboard.previous_value", { value }) : undefined
  const days = (n?: number | null) =>
    n == null ? undefined : t("reports.days", { count: n })
  const hours = (n?: number | null) =>
    n == null ? undefined : t("reports.hours", { count: n })
  // Live listings per group, with the period's new ones under the name.
  const rows = (list: Split[] | undefined, label: (key: string) => string) =>
    list?.map((r) => ({
      key: r.key,
      value: r.live,
      label: (
        <span className="flex flex-col">
          <bdi>{label(r.key)}</bdi>
          <span className="text-caption">
            {t("reports.insights_new_count", {
              value: formatNumber(r.created, locale),
            })}
          </span>
        </span>
      ),
    }))
  const cityName = (id: string) =>
    taxonomy?.cities.find((c) => c.id === id)?.name[locale] ?? id
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard
          label={t("reports.stat_live")}
          value={data?.liveNow}
          detail={t("reports.now")}
          loading={isPending}
        />
        <StatCard
          label={t("reports.insights_stat_created")}
          value={data?.created.count}
          previous={data?.created.previous}
          compare={compare}
          loading={isPending}
        />
        <StatCard
          label={t("reports.insights_stat_sold")}
          value={data?.sold.count}
          previous={data?.sold.previous}
          compare={compare}
          loading={isPending}
        />
        <StatCard
          label={t("reports.insights_stat_contacted")}
          value={data?.contacted.rate}
          previous={data?.contacted.previous ?? undefined}
          compare={compare}
          suffix="%"
          empty={t("reports.insights_contacted_empty")}
          note={
            data?.contacted.base
              ? t("reports.insights_contacted_base", {
                  value: formatNumber(data.contacted.base, locale),
                })
              : undefined
          }
          loading={isPending}
        />
        <StatCard
          label={t("reports.stat_days_to_sell")}
          value={data?.daysToSell.median}
          display={days(data?.daysToSell.median)}
          empty={t("reports.no_sales")}
          note={before(days(data?.daysToSell.previous))}
          loading={isPending}
        />
        <StatCard
          label={t("reports.insights_stat_review")}
          value={data?.decisionHours.median}
          display={hours(data?.decisionHours.median)}
          empty={t("reports.insights_review_empty")}
          note={before(hours(data?.decisionHours.previous))}
          loading={isPending}
        />
      </div>
      <BarChartCard
        title={t("reports.insights_chart_flow")}
        series={[
          { key: "created", label: t("reports.insights_stat_created") },
          { key: "sold", label: t("reports.insights_stat_sold") },
        ]}
        csvName={t("reports.tab_marketplace")}
        loading={isPending}
        {...reportChart({
          t,
          period: data?.period,
          rows: dayRows(data?.series),
          previous: dayRows(data?.previousSeries),
        })}
      />
      <ContactHeatmap
        cells={contacts.data?.contactHours}
        since={contacts.data?.hourlySince}
        from={contacts.data?.period.from}
        loading={contacts.isPending}
        error={contacts.isError}
        onRetry={() => void contacts.refetch()}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <BarListCard
          title={t("reports.insights_lifecycle")}
          rows={data?.lifecycle.map((r) => ({
            key: r.state,
            label: t(`reports.insights_state_${r.state}`),
            value: r.count,
          }))}
          loading={isPending}
        >
          <p className="text-caption text-muted-foreground">
            {t("reports.insights_lifecycle_note")}
          </p>
        </BarListCard>
        <BarListCard
          title={t("reports.insights_by_type")}
          rows={rows(data?.byType, (k) => t(`post.type_${k}`))}
          loading={isPending}
        />
        <BarListCard
          title={t("reports.insights_by_intent")}
          rows={rows(data?.byIntent, (k) => t(`common.for_${k}`))}
          loading={isPending}
        />
        <BarListCard
          title={t("reports.insights_by_city")}
          rows={rows(data?.byCity, cityName)}
          loading={isPending}
        />
      </div>
      <PriceTable rows={data?.prices} loading={isPending} />
    </div>
  )
}
