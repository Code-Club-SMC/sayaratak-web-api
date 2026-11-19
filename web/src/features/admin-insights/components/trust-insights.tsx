import { useQuery } from "@tanstack/react-query"

import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import { trustInsightsQuery } from "../queries"
import { TrustCharts } from "./trust-charts"

// Trust & safety (step 11.7-r12a): listing decisions and the pending queue, abuse reports, verification turnaround and flagged reviews. Decisions count on the day an admin made them.
export function TrustInsights({ query }: { query: PeriodQuery }) {
  const { t, locale } = useT()
  const report = useQuery(trustInsightsQuery(query))
  const { data, isPending } = report
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  const compare = data?.period.compare
  const num = (n: number) => formatNumber(n, locale)
  const hours = (n?: number | null) =>
    n == null ? undefined : t("reports.hours", { count: n })
  const before = (n?: number | null) =>
    n == null ? undefined : t("dashboard.previous_value", { value: hours(n) })
  const oldest = (n?: number | null) =>
    n == null ? undefined : t("reports.revenue_oldest", { value: hours(n) })
  const join = (...parts: (string | false | undefined)[]) =>
    parts.filter(Boolean).join(" · ")
  const l = data?.listings
  const r = data?.reports
  const v = data?.verifications
  const rv = data?.reviews
  const common = { compare, loading: isPending }
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <p className="text-caption text-muted-foreground">
        {t("reports.trust_day_note")}
      </p>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label={t("reports.trust_stat_queue")}
          value={l?.queue.count}
          detail={t("reports.now")}
          note={oldest(l?.queue.oldestHours)}
          loading={isPending}
        />
        <StatCard
          label={t("reports.trust_stat_wait")}
          value={l?.waitHours.median}
          display={hours(l?.waitHours.median)}
          empty={t("reports.trust_wait_empty")}
          note={before(l?.waitHours.previous)}
          loading={isPending}
        />
        <StatCard
          label={t("reports.trust_stat_rejected")}
          value={l?.rejected.count}
          previous={l?.rejected.previous}
          note={
            l &&
            join(
              t("reports.trust_approved", { value: num(l.approved.count) }),
              t("reports.trust_removed", { value: num(l.removed.count) })
            )
          }
          {...common}
        />
        <StatCard
          label={t("reports.trust_stat_reports")}
          value={r?.received.count}
          previous={r?.received.previous}
          note={
            r &&
            join(
              t("reports.trust_open", { value: num(r.open.count) }),
              oldest(r.open.oldestHours)
            )
          }
          {...common}
        />
        <StatCard
          label={t("reports.trust_stat_resolve")}
          value={r?.resolveHours.median}
          display={hours(r?.resolveHours.median)}
          empty={t("reports.trust_resolve_empty")}
          note={
            r &&
            join(
              t("reports.trust_actioned", { value: num(r.actioned.count) }),
              t("reports.trust_dismissed", { value: num(r.dismissed.count) })
            )
          }
          loading={isPending}
        />
        <StatCard
          label={t("reports.trust_stat_verify")}
          value={v?.hours.median}
          display={hours(v?.hours.median)}
          empty={t("reports.trust_verify_empty")}
          note={
            v &&
            join(
              t("reports.trust_approved", { value: num(v.approved.count) }),
              t("reports.trust_rejected", { value: num(v.rejected.count) }),
              t("reports.trust_waiting", { value: num(v.pending.count) })
            )
          }
          loading={isPending}
        />
        <StatCard
          label={t("reports.trust_stat_flagged")}
          value={rv?.flagged.count}
          previous={rv?.flagged.previous}
          note={
            rv &&
            join(
              t("reports.trust_hidden", { value: num(rv.hidden.count) }),
              t("reports.trust_kept", { value: num(rv.kept.count) })
            )
          }
          {...common}
        />
        <StatCard
          label={t("reports.trust_stat_flag_time")}
          value={rv?.hours.median}
          display={hours(rv?.hours.median)}
          empty={t("reports.trust_flag_empty")}
          note={
            rv &&
            join(
              t("reports.trust_waiting", { value: num(rv.waiting.count) }),
              oldest(rv.waiting.oldestHours)
            )
          }
          loading={isPending}
        />
      </div>
      <TrustCharts data={data} loading={isPending} />
    </div>
  )
}
