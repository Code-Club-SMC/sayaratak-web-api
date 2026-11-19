import { BarChartCard } from "@/components/app/bar-chart-card"
import { BarListCard } from "@/components/app/bar-list-card"
import { dayRows, reportChart } from "@/features/analytics/chart-props"
import { useT } from "@/lib/i18n/use-t"
import type { TrustReport } from "@sayaratak/shared/schemas/reports-trust"

const DECISIONS = ["approved", "rejected", "removed"] as const

// The Trust & safety charts and splits (step 11.7-r12a): decisions and reports per bucket, the queue by age, rejections by reason and reports by reason.
export function TrustCharts({
  data,
  loading,
}: {
  data?: TrustReport
  loading: boolean
}) {
  const { t } = useT()
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarChartCard
          title={t("reports.trust_chart_decisions")}
          series={DECISIONS.map((key) => ({
            key,
            label: t(`reports.trust_decision_${key}`),
          }))}
          stacked
          csvName={t("reports.trust_chart_decisions")}
          loading={loading}
          {...reportChart({
            t,
            period: data?.period,
            rows: dayRows(data?.listings.series),
            previous: dayRows(data?.listings.previousSeries),
          })}
        />
        <BarChartCard
          title={t("reports.trust_chart_reports")}
          series={[
            { key: "received", label: t("reports.trust_received") },
            { key: "resolved", label: t("reports.trust_resolved") },
          ]}
          csvName={t("reports.trust_chart_reports")}
          loading={loading}
          {...reportChart({
            t,
            period: data?.period,
            rows: dayRows(data?.reports.series),
            previous: dayRows(data?.reports.previousSeries),
          })}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <BarListCard
          title={t("reports.trust_queue_ages")}
          rows={data?.listings.queue.ages.map((a) => ({
            key: a.age,
            label: t(`reports.trust_age_${a.age}`),
            value: a.count,
          }))}
          loading={loading}
        />
        <BarListCard
          title={t("reports.trust_reasons")}
          rows={data?.listings.reasons.map((r) => ({
            key: r.code,
            label:
              r.code === "other"
                ? t("reports.trust_code_typed")
                : r.code === "unknown"
                  ? t("reports.trust_code_unknown")
                  : t(`admin.reject_${r.code}`),
            value: r.count,
          }))}
          loading={loading}
        >
          {data?.listings.reasons.length === 0 && (
            <p className="text-caption text-muted-foreground">
              {t("reports.trust_reasons_empty")}
            </p>
          )}
        </BarListCard>
        <BarListCard
          title={t("reports.trust_report_reasons")}
          rows={data?.reports.byReason.map((r) => ({
            key: r.reason,
            label: t(
              r.reason === "other"
                ? "listing.report_misc"
                : `listing.report_${r.reason}`
            ),
            value: r.count,
          }))}
          loading={loading}
        >
          {data?.reports.byReason.length === 0 && (
            <p className="text-caption text-muted-foreground">
              {t("reports.trust_report_reasons_empty")}
            </p>
          )}
        </BarListCard>
      </div>
    </>
  )
}
