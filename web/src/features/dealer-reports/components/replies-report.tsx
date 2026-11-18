import { useQuery } from "@tanstack/react-query"

import { BarListCard } from "@/components/app/bar-list-card"
import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import { durationText } from "../duration"
import { repliesReportQuery } from "../queries"
import { UnansweredCard } from "./unanswered-card"

// How fast buyers get an answer: threads they started in the period, the typical first-reply time, the share answered within 24 hours, speed bands and the threads waiting now (step 11.7-r6).
export function RepliesReport({ query }: { query: PeriodQuery }) {
  const { t, locale } = useT()
  const report = useQuery(repliesReportQuery(query))
  const { data, isPending } = report
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  const now = data?.summary
  const before = data?.previous
  const previous = (text?: string) =>
    text ? t("dashboard.previous_value", { value: text }) : undefined
  const wait = (m?: number | null) =>
    m == null ? undefined : durationText(t, m)
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <StatCard
          label={t("reports.stat_reply_time")}
          value={now ? now.medianMinutes : undefined}
          display={wait(now?.medianMinutes)}
          empty={t("reports.no_replies")}
          note={previous(wait(before?.medianMinutes))}
          loading={isPending}
        />
        <StatCard
          label={t("reports.stat_reply_rate")}
          value={now ? now.replyRate : undefined}
          suffix="%"
          empty={t("reports.no_threads")}
          note={previous(
            before?.replyRate != null ? `${before.replyRate}%` : undefined
          )}
          loading={isPending}
        />
        <StatCard
          label={t("reports.stat_threads")}
          value={now?.threads}
          note={previous(
            before ? formatNumber(before.threads, locale) : undefined
          )}
          loading={isPending}
        />
      </div>
      <p className="text-caption text-muted-foreground">
        {t("reports.replies_note")}
      </p>
      <BarListCard
        title={t("reports.speed_title")}
        loading={isPending}
        rows={data?.speed.map((s) => ({
          key: s.key,
          label: t(`reports.speed_${s.key}`),
          value: s.count,
        }))}
      />
      <UnansweredCard unanswered={data?.unanswered} loading={isPending} />
    </div>
  )
}
