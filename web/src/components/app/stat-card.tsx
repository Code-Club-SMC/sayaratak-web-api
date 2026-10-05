import { useT } from "@/lib/i18n/use-t"
import { formatNumber } from "@/lib/format"
import { Skeleton } from "@/components/ui/skeleton"

// `previous` is the same measure for the period before, so the change reads against equal-length periods. Without it, or when it is 0, no change is shown.
export function StatCard({
  label,
  value,
  previous,
  loading,
}: {
  label: string
  value?: number
  previous?: number
  loading?: boolean
}) {
  const { t, locale } = useT()
  const change =
    value !== undefined && previous
      ? Math.round(((value - previous) / previous) * 100)
      : undefined
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-card p-5">
      <p className="text-caption text-muted-foreground">{label}</p>
      {loading || value === undefined ? (
        <Skeleton className="h-8 w-24" aria-hidden="true" />
      ) : (
        <p className="text-title font-semibold num">
          {formatNumber(value, locale)}
        </p>
      )}
      {change !== undefined && !loading && (
        <p
          className={`text-caption num ${change < 0 ? "text-destructive" : "text-success"}`}
        >
          <bdi dir="ltr">
            {change > 0 ? "+" : ""}
            {formatNumber(change, locale)}%
          </bdi>{" "}
          <span className="text-muted-foreground">
            {t("dashboard.vs_previous")}
          </span>
        </p>
      )}
    </div>
  )
}
