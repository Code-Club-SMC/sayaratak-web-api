import { useQuery } from "@tanstack/react-query"
import { StarIcon } from "lucide-react"

import { BarChartCard } from "@/components/app/bar-chart-card"
import { BarListCard } from "@/components/app/bar-list-card"
import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { dayRows, reportChart } from "@/features/analytics/chart-props"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import { durationText } from "../duration"
import { reviewsReportQuery } from "../queries"

// Visible reviews of the business: all-time and period rating, reply rate and time, stars per bucket against the compare window, and the star breakdown (step 11.7-r6).
export function ReviewsReport({ query }: { query: PeriodQuery }) {
  const { t, locale } = useT()
  const report = useQuery(reviewsReportQuery(query))
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
  const hours = (h?: number | null) =>
    h == null ? undefined : durationText(t, h * 60)
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <div className="stat-grid">
        <div className="grid grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("reports.stat_rating_all")}
            value={data ? data.allTime.average : undefined}
            empty={t("reports.no_reviews")}
            detail={
              data
                ? t("reports.review_count", { count: data.allTime.count })
                : undefined
            }
            loading={isPending}
          />
          <StatCard
            label={t("reports.stat_rating_period")}
            value={now ? now.average : undefined}
            empty={t("reports.no_reviews_period")}
            detail={
              now ? t("reports.review_count", { count: now.count }) : undefined
            }
            note={previous(
              before?.average != null
                ? formatNumber(before.average, locale)
                : undefined
            )}
            loading={isPending}
          />
          <StatCard
            label={t("reports.stat_review_reply_rate")}
            value={now ? now.replyRate : undefined}
            suffix="%"
            empty={t("reports.no_reviews_period")}
            note={previous(
              before?.replyRate != null ? `${before.replyRate}%` : undefined
            )}
            loading={isPending}
          />
          <StatCard
            label={t("reports.stat_review_reply_time")}
            value={now ? now.medianReplyHours : undefined}
            display={hours(now?.medianReplyHours)}
            empty={t("reports.no_replies")}
            loading={isPending}
            note={previous(hours(before?.medianReplyHours))}
          />
        </div>
      </div>
      <BarChartCard
        title={t("reports.chart_rating")}
        series={[{ key: "average", label: t("reports.series_rating") }]}
        loading={isPending}
        {...reportChart({
          t,
          period: data?.period,
          rows: dayRows(
            data?.trend.map(({ date, average }) => ({ date, average }))
          ),
          previous: dayRows(
            data?.previousTrend.map(({ date, average }) => ({ date, average }))
          ),
        })}
      />
      <BarListCard
        title={t("reports.stars_title")}
        loading={isPending}
        rows={data?.stars.map((s) => ({
          key: String(s.stars),
          label: (
            <span className="inline-flex items-center gap-1">
              {formatNumber(s.stars, locale)}
              <StarIcon aria-hidden="true" className="size-3.5" />
              <span className="sr-only">
                {t("reports.stars", { count: s.stars })}
              </span>
            </span>
          ),
          value: s.count,
        }))}
      />
    </div>
  )
}
