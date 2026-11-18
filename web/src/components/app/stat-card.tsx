import { Link, type LinkProps } from "@tanstack/react-router"

import { useT } from "@/lib/i18n/use-t"
import { formatNumber } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"
import type { Compare } from "@sayaratak/shared/schemas/period"
import { Sparkline } from "./sparkline"

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
      <p className="text-caption text-muted-foreground">{label}</p>
      {loading || value === undefined ? (
        <Skeleton className="h-8 w-24" aria-hidden="true" />
      ) : value === null ? (
        <>
          <p className="text-title font-semibold" aria-hidden="true">
            —
          </p>
          {empty && (
            <p className="text-caption text-muted-foreground">{empty}</p>
          )}
        </>
      ) : (
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-title font-semibold num">
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
          <p
            className={`text-caption num ${change < 0 ? "text-destructive" : "text-success"}`}
          >
            <bdi dir="ltr">
              {change > 0 ? "+" : ""}
              {formatNumber(change, locale)}%
            </bdi>{" "}
            <span className="text-muted-foreground">
              {t(
                compare === "year"
                  ? "dashboard.vs_year"
                  : "dashboard.vs_previous"
              )}
            </span>
          </p>
        )
      )}
      {spark && previous !== undefined && !unavailable && !loading && (
        <p className="text-caption text-muted-foreground num">
          {t("dashboard.previous_value", {
            value: formatNumber(previous, locale),
          })}
        </p>
      )}
    </>
  )
  const card = "flex flex-col gap-1 rounded-xl bg-card p-5"
  return link ? (
    <Link {...link} className={`${card} motion-color hover:bg-muted`}>
      {body}
    </Link>
  ) : (
    <div className={card}>{body}</div>
  )
}
