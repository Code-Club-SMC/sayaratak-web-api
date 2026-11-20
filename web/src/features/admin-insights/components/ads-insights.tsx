import { useQuery } from "@tanstack/react-query"

import { AreaChartCard } from "@/components/app/area-chart-card"
import { BarChartCard } from "@/components/app/bar-chart-card"
import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { dayRows, reportChart } from "@/features/analytics/chart-props"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import type { AdsReport } from "@sayaratak/shared/schemas/reports-ads"
import { adsInsightsQuery } from "../queries"
import { AdsList, PagesFill } from "./ads-tables"

type Totals = AdsReport["campaigns"]

// Ads (step 11.7-r12b): banner views and click rate of paid campaigns and admin banners, and how full the paid slots were.
export function AdsInsights({ query }: { query: PeriodQuery }) {
  const { t, locale } = useT()
  const report = useQuery(adsInsightsQuery(query))
  const { data, isPending } = report
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  const num = (n: number) => formatNumber(n, locale)
  const common = { compare: data?.period.compare, loading: isPending }
  const views = (label: string, x?: Totals) => (
    <StatCard
      label={label}
      value={x?.views.count}
      previous={x?.views.previous}
      unavailable={data?.period.eventsCompared === false}
      note={x && t("reports.ads_clicks", { value: num(x.clicks.count) })}
      {...common}
    />
  )
  const ctr = (label: string, x?: Totals) => (
    <StatCard
      label={label}
      value={x && x.ctr.value}
      previous={x?.ctr.previous ?? undefined}
      unavailable={data?.period.eventsCompared === false}
      suffix="%"
      empty={t("reports.ads_ctr_empty")}
      {...common}
    />
  )
  const campaigns = data?.ads.filter((a) => a.kind === "campaign").length
  const banners = data?.ads.filter((a) => a.kind === "banner").length
  const chart = (rows?: AdsReport["series"]) => dayRows(rows)
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <p className="text-caption text-muted-foreground">
        {t("reports.ads_day_note")}
      </p>
      <div className="stat-grid">
        <div className="grid grid-cols-2 xl:grid-cols-3">
          {views(t("reports.ads_stat_campaign_views"), data?.campaigns)}
          {ctr(t("reports.ads_stat_campaign_ctr"), data?.campaigns)}
          <StatCard
            label={t("reports.ads_stat_fill")}
            value={data && data.fill.pct}
            previous={data?.fill.previous ?? undefined}
            suffix="%"
            empty={t("reports.ads_fill_empty")}
            {...common}
          />
          {views(t("reports.ads_stat_banner_views"), data?.banners)}
          {ctr(t("reports.ads_stat_banner_ctr"), data?.banners)}
          <StatCard
            label={t("reports.ads_stat_running")}
            value={campaigns}
            note={
              banners === undefined
                ? undefined
                : t("reports.ads_banners_count", { value: num(banners) })
            }
            loading={isPending}
          />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title={t("reports.ads_chart_views")}
          series={[
            { key: "campaignViews", label: t("reports.ads_series_campaign") },
            { key: "bannerViews", label: t("reports.ads_series_banner") },
          ]}
          stacked
          csvName={t("reports.ads_chart_views")}
          loading={isPending}
          {...reportChart({
            t,
            period: data?.period,
            rows: chart(data?.series),
            previous: chart(data?.previousSeries),
            events: true,
          })}
        />
        <AreaChartCard
          title={t("reports.ads_chart_ctr")}
          series={[
            { key: "campaignCtr", label: t("reports.ads_series_campaign") },
            { key: "bannerCtr", label: t("reports.ads_series_banner") },
          ]}
          csvName={t("reports.ads_chart_ctr")}
          loading={isPending}
          {...reportChart({
            t,
            period: data?.period,
            rows: chart(data?.series),
          })}
        />
      </div>
      <PagesFill rows={data?.pages} loading={isPending} />
      <AdsList rows={data?.ads} loading={isPending} />
    </div>
  )
}
