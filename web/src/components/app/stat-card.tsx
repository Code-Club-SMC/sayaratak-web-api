import { Link, type LinkProps } from "@tanstack/react-router"
import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { formatNumber } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import type { Compare } from "@sayaratak/shared/schemas/period"
import { Sparkline } from "./sparkline"

// One cell of a `stat-grid` panel (the grid draws the hairlines, so the cell has no corners or fill of its own).
// `previous` is the same measure for the compare window (`compare`: the period before, default, or a year earlier); the card shows the change, and report cards (with `spark`) the previous value too. Without it no change is shown, and when it is 0 only the value. `unavailable` says the change cannot be worked out (old counters kept per month only). `spark` draws the trend under the number. `detail` sits beside the number ("of 20", "12 reviews"); `link` turns the whole card into a link to the page that explains the number.
export function StatCard({
  label,
  value,
  previous,
  compare = "previous",
  unavailable,
  spark,
  loading,
  detail,
  link,
  empty,
  suffix,
  note,
  display,
}: {
  label: string
  // `null`: nothing to measure yet; the card shows a dash and `empty`.
  value?: number | null
  previous?: number
  compare?: Compare
  unavailable?: boolean
  spark?: number[]
  loading?: boolean
  detail?: string
  link?: LinkProps
  empty?: string
  // A unit after the number, such as "%".
  suffix?: string
  // One muted line under the number.
  note?: string
  // Text shown instead of the formatted number, such as a duration ("5 hours").
  display?: string
}) {
  const { t, locale } = useT()
  const change =
    value != null && previous
      ? Math.round(((value - previous) / previous) * 100) || 0 // `|| 0` turns -0 into 0, so a tiny drop reads "0%", not "-0%"
      : undefined
  const body = (
    <>
      <p className="flex items-center justify-between gap-2 text-ui font-medium text-muted-foreground">
        {label}
        {link && (
          <ChevronRightIcon
            aria-hidden="true"
            className="size-4 shrink-0 opacity-0 motion-fade group-hover:opacity-100 rtl:-scale-x-100"
          />
        )}
      </p>
      {loading || value === undefined ? (
        <Skeleton className="h-9 w-24" aria-hidden="true" />
      ) : value === null ? (
        <>
          <p
            className="text-page font-semibold text-muted-foreground"
            aria-hidden="true"
          >
            —
          </p>
          {empty && (
            <p className="text-caption text-muted-foreground">{empty}</p>
          )}
        </>
      ) : (
        <p className="flex flex-wrap items-baseline gap-x-2">
          {/* A zero goes grey so the real numbers in the row stand out. */}
          <span
            className={`font-mono text-page font-medium tracking-tight ${value === 0 && !display ? "text-muted-foreground" : ""}`}
          >
            {display ??
              (suffix ? (
                <bdi dir="ltr">
                  {formatNumber(value, locale)}
                  {suffix}
                </bdi>
              ) : (
                formatNumber(value, locale)
              ))}
          </span>
          {detail && (
            <span className="text-ui text-muted-foreground num">{detail}</span>
          )}
        </p>
      )}
      {note && !loading && (
        <p className="text-caption text-muted-foreground">{note}</p>
      )}
      {spark && !loading && <Sparkline values={spark} />}
      {unavailable && !loading ? (
        <p className="text-caption text-muted-foreground">
          {t("dashboard.change_unavailable")}
        </p>
      ) : (
        change !== undefined &&
        !loading && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-muted-foreground">
            {/* Arrow and tint together, so the direction reads without colour. */}
            <span
              className={`inline-flex items-center gap-0.5 rounded-sm px-1.5 font-semibold num ${change > 0 ? "bg-success/10 text-success" : change < 0 ? "bg-destructive/10 text-destructive" : "bg-muted"}`}
            >
              {change > 0 && (
                <ArrowUpIcon aria-hidden="true" className="size-3" />
              )}
              {change < 0 && (
                <ArrowDownIcon aria-hidden="true" className="size-3" />
              )}
              <bdi dir="ltr">
                {change > 0 ? "+" : ""}
                {formatNumber(change, locale)}%
              </bdi>
            </span>
            <span>
              {t(
                compare === "year"
                  ? "dashboard.vs_year"
                  : "dashboard.vs_previous"
              )}
            </span>
          </p>
        )
      )}
      {spark && !!previous && !unavailable && !loading && (
        <p className="text-caption text-muted-foreground num">
          {t("dashboard.previous_value", {
            value: formatNumber(previous, locale),
          })}
        </p>
      )}
    </>
  )
  const card = "flex min-w-0 flex-col gap-1.5 px-5 py-4"
  return link ? (
    <Link {...link} className={`group ${card} motion-color hover:bg-muted`}>
      {body}
    </Link>
  ) : (
    <div className={card}>{body}</div>
  )
}
