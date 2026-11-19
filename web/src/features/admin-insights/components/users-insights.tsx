import { useQuery } from "@tanstack/react-query"

import { AreaChartCard } from "@/components/app/area-chart-card"
import { BarChartCard } from "@/components/app/bar-chart-card"
import { BarListCard } from "@/components/app/bar-list-card"
import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { dayRows, reportChart } from "@/features/analytics/chart-props"
import { formatDate, formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import { usersInsightsQuery } from "../queries"

// Accounts (step 11.7-r10): sign-ups by role and method, signed-in accounts per day, week and month, the devices they use and their language.
export function UsersInsights({ query }: { query: PeriodQuery }) {
  const { t, locale } = useT()
  const report = useQuery(usersInsightsQuery(query))
  const { data, isPending } = report
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  const compare = data?.period.compare
  const since = data?.activeSince
  const chart = (key: "signups" | "active") =>
    reportChart({
      t,
      period: data?.period,
      rows: dayRows(data?.series.map((p) => ({ date: p.date, [key]: p[key] }))),
      previous: dayRows(
        data?.previousSeries.map((p) => ({ date: p.date, [key]: p[key] }))
      ),
    })
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <p className="text-caption text-muted-foreground">
        {since
          ? t("reports.insights_active_since", {
              date: formatDate(`${since}T10:00:00Z`, locale),
            })
          : t("reports.insights_active_none")}
      </p>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard
          label={t("reports.insights_stat_accounts")}
          value={data?.accounts}
          detail={t("reports.now")}
          loading={isPending}
        />
        <StatCard
          label={t("reports.insights_stat_signups")}
          value={data?.signups.count}
          previous={data?.signups.previous}
          compare={compare}
          loading={isPending}
        />
        <StatCard
          label={t("reports.insights_stat_dau")}
          value={data?.dau.value}
          previous={data?.dau.previous ?? undefined}
          compare={compare}
          empty={t("reports.insights_active_none")}
          loading={isPending}
        />
        <StatCard
          label={t("reports.insights_stat_wau")}
          value={data?.wau}
          detail={t("reports.insights_to_end")}
          loading={isPending}
        />
        <StatCard
          label={t("reports.insights_stat_mau")}
          value={data?.mau}
          detail={t("reports.insights_to_end")}
          loading={isPending}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title={t("reports.insights_stat_signups")}
          series={[
            { key: "signups", label: t("reports.insights_stat_signups") },
          ]}
          csvName={t("reports.insights_stat_signups")}
          loading={isPending}
          {...chart("signups")}
        />
        <AreaChartCard
          title={t("reports.insights_chart_active")}
          series={[
            { key: "active", label: t("reports.insights_chart_active") },
          ]}
          csvName={t("reports.insights_chart_active")}
          loading={isPending}
          {...chart("active")}
        />
        <BarListCard
          title={t("reports.insights_by_role")}
          rows={data?.byRole.map((r) => ({
            key: r.key,
            label: t(`dashboard.role_${r.key}`),
            value: r.count,
          }))}
          loading={isPending}
        />
        <BarListCard
          title={t("reports.insights_by_method")}
          rows={data?.byMethod.map((r) => ({
            key: r.key,
            label: t(`reports.insights_method_${r.key}`),
            value: r.count,
          }))}
          loading={isPending}
        />
        <BarListCard
          title={t("reports.insights_devices")}
          rows={data?.devices.map((r) => ({
            key: r.key,
            label: t(`reports.insights_device_${r.key}`),
            value: r.count,
          }))}
          loading={isPending}
        >
          <p className="text-caption text-muted-foreground">
            {t("reports.insights_devices_note")}
          </p>
        </BarListCard>
        <BarListCard
          title={t("reports.insights_languages")}
          rows={data?.languages.map((r) => ({
            key: r.key,
            value: r.accounts,
            label: (
              <span className="flex flex-col">
                {t(`nav.language_${r.key}`)}
                <span className="text-caption">
                  {t("reports.insights_active_count", {
                    value: formatNumber(r.active, locale),
                  })}
                </span>
              </span>
            ),
          }))}
          loading={isPending}
        />
      </div>
    </div>
  )
}
