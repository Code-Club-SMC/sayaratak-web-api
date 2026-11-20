import { useQuery } from "@tanstack/react-query"

import { BarChartCard } from "@/components/app/bar-chart-card"
import { BarListCard, type BarListRow } from "@/components/app/bar-list-card"
import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { dayRows, reportChart } from "@/features/analytics/chart-props"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import type {
  SearchReport,
  SearchTopRow,
} from "@sayaratak/shared/schemas/reports-search"
import { searchInsightsQuery } from "../queries"
import { MakesTable, MissedTable, useNames } from "./search-tables"

// Search demand (step 11.7-r13): what people searched for on page 1 and what found nothing. Searches count whole days.
export function SearchInsights({ query }: { query: PeriodQuery }) {
  const { t } = useT()
  const names = useNames()
  const report = useQuery(searchInsightsQuery(query))
  const { data, isPending } = report
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  const common = { compare: data?.period.compare, loading: isPending }
  const rate = (label: string, x?: SearchReport["missRate"]) => (
    <StatCard
      label={label}
      value={x && x.value}
      previous={x?.previous ?? undefined}
      suffix="%"
      empty={t("reports.search_rate_empty")}
      {...common}
    />
  )
  const list = <TRow extends SearchTopRow>(
    rows: TRow[] | undefined,
    name: (r: TRow) => string
  ): BarListRow[] | undefined =>
    rows?.map((r) => ({
      key: r.id,
      value: r.searches,
      label: <bdi>{name(r)}</bdi>,
    }))
  const period = data && {
    ...data.period,
    granularity: data.seriesGranularity,
  }
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <p className="text-caption text-muted-foreground">
        {t("reports.search_day_note")}
      </p>
      <div className="stat-grid">
        <div className="grid grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("reports.search_stat_searches")}
            value={data?.searches.count}
            previous={data?.searches.previous}
            {...common}
          />
          <StatCard
            label={t("reports.search_stat_misses")}
            value={data?.misses.count}
            previous={data?.misses.previous}
            {...common}
          />
          {rate(t("reports.search_stat_miss_rate"), data?.missRate)}
          {rate(t("reports.search_stat_text_rate"), data?.textRate)}
        </div>
      </div>
      <BarChartCard
        title={t("reports.search_chart")}
        series={[
          { key: "searches", label: t("reports.search_col_searches") },
          { key: "misses", label: t("reports.search_col_misses") },
        ]}
        csvName={t("reports.tab_search")}
        loading={isPending}
        {...reportChart({
          t,
          period,
          rows: dayRows(data?.series),
          previous: dayRows(data?.previousSeries),
        })}
      />
      <MakesTable
        rows={data?.makes}
        average={data?.perListing}
        loading={isPending}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <BarListCard
          title={t("reports.search_models")}
          rows={list(
            data?.models,
            (r) => `${names.make(r.makeId)} ${names.model(r.id)}`
          )}
          loading={isPending}
        />
        <BarListCard
          title={t("reports.search_cities")}
          rows={list(data?.cities, (r) => names.city(r.id))}
          loading={isPending}
        />
        <BarListCard
          title={t("reports.search_parts")}
          rows={list(data?.partCategories, (r) => names.part(r.id))}
          loading={isPending}
        />
        <BarListCard
          title={t("reports.search_by_kind")}
          rows={list(data?.byKind, (r) => t(`reports.search_kind_${r.id}`))}
          loading={isPending}
        />
      </div>
      <MissedTable rows={data?.missed} loading={isPending} />
    </div>
  )
}
