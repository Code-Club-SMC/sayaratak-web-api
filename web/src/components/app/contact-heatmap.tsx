import { useId } from "react"

import { SectionError } from "@/components/app/section-error"
import { Skeleton } from "@/components/ui/skeleton"
import {
  formatHour,
  formatNumber,
  formatShortDate,
  formatWeekday,
  formatWeekdayShort,
} from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { cn } from "@/lib/utils"

const DAYS = [0, 1, 2, 3, 4, 5, 6]
const HOURS = Array.from({ length: 24 }, (_, h) => h)
// Five steps from none to the busiest hour; flat fills, no gradient (A5).
const LEVELS = [
  "bg-muted",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/70",
  "bg-primary",
]

const levelOf = (count: number, max: number) =>
  count === 0 || max === 0 ? 0 : Math.min(4, Math.ceil((count / max) * 4))

// Weekday x hour grid of contacts (calls, WhatsApp, messages) in Khartoum time, step 11.7-r2. `cells[weekday * 24 + hour]`, weekday 0 is Sunday. A real table, so screen readers get each count with its day and hour. `since` later than the period's first day (`from`) adds a note: hourly counts are kept 90 days and start on deploy.
export function ContactHeatmap({
  cells,
  since,
  from,
  loading,
  error,
  onRetry,
}: {
  cells?: number[]
  since?: string
  from?: string
  loading?: boolean
  error?: boolean
  onRetry?: () => void
}) {
  const { t, locale } = useT()
  const id = useId()
  const max = Math.max(0, ...(cells ?? []))
  const busiest = cells ? cells.indexOf(max) : -1
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl bg-card p-5"
    >
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-body font-semibold">
          {t("dashboard.heatmap_title")}
        </h2>
        <p className="text-caption text-muted-foreground">
          {t("dashboard.heatmap_desc")}
        </p>
        {since && from && from.slice(0, 10) < since && (
          <p className="text-caption text-muted-foreground">
            {t("dashboard.note_hourly_since", {
              date: formatShortDate(since, locale),
            })}
          </p>
        )}
      </div>
      {error ? (
        <SectionError
          message={t("analytics.load_error")}
          onRetry={() => onRetry?.()}
        />
      ) : loading || !cells ? (
        <Skeleton className="h-44" aria-hidden="true" />
      ) : max === 0 ? (
        <p className="text-ui text-muted-foreground">
          {t("dashboard.heatmap_empty")}
        </p>
      ) : (
        <>
          <table className="w-full table-fixed border-separate border-spacing-0.5">
            <caption className="sr-only">{t("dashboard.heatmap_desc")}</caption>
            <thead>
              <tr>
                <th scope="col" className="w-10">
                  <span className="sr-only">{t("dashboard.heatmap_day")}</span>
                </th>
                {HOURS.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="text-caption font-normal text-muted-foreground"
                  >
                    <span className={cn(h % 6 !== 0 && "sr-only")}>
                      {formatHour(h).slice(0, 2)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((d) => (
                <tr key={d}>
                  <th
                    scope="row"
                    className="text-start text-caption font-normal text-muted-foreground"
                  >
                    {formatWeekdayShort(d, locale)}
                  </th>
                  {HOURS.map((h) => {
                    const count = cells[d * 24 + h] ?? 0
                    return (
                      <td
                        key={h}
                        title={t("dashboard.heatmap_cell", {
                          day: formatWeekday(d, locale),
                          hour: formatHour(h),
                          count: formatNumber(count, locale),
                        })}
                        className={cn(
                          "h-4 rounded-sm sm:h-6",
                          LEVELS[levelOf(count, max)]
                        )}
                      >
                        <span className="sr-only">
                          {formatNumber(count, locale)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
            <p>
              {t("dashboard.heatmap_busiest", {
                day: formatWeekday(Math.floor(busiest / 24), locale),
                hour: formatHour(busiest % 24),
              })}
            </p>
            <div className="flex items-center gap-1" aria-hidden="true">
              <span>{t("dashboard.heatmap_fewer")}</span>
              {LEVELS.map((level) => (
                <span key={level} className={cn("size-3 rounded-sm", level)} />
              ))}
              <span>{t("dashboard.heatmap_more")}</span>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
