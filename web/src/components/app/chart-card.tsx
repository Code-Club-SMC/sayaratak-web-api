import { lazy, Suspense, useId } from "react"

import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export type ChartSeries = { key: string; label: string }
export type ChartRow = { day: string } & Record<string, number | string>

export type ChartCardProps = {
  title: string
  data?: ChartRow[]
  series: ChartSeries[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
}

// Recharts is heavy, so it loads on first render of a chart and never in a page's own chunk.
const Impl = lazy(() =>
  import("./chart-impl").then((m) => ({ default: m.ChartImpl }))
)

// Shared by AreaChartCard and BarChartCard: title, loading skeleton, error with retry, empty line.
export function ChartCard({
  kind,
  title,
  data,
  series,
  loading,
  error,
  onRetry,
}: ChartCardProps & { kind: "area" | "bar" }) {
  const { t } = useT()
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl bg-card p-5"
    >
      <h2 id={id} className="text-body font-semibold">
        {title}
      </h2>
      {error ? (
        <div role="alert" className="flex h-64 flex-col items-start gap-3">
          <p className="text-body text-muted-foreground">
            {t("dashboard.chart_error")}
          </p>
          <Button type="button" variant="outline" onClick={onRetry}>
            {t("common.retry")}
          </Button>
        </div>
      ) : loading ? (
        <Skeleton className="h-64" aria-hidden="true" />
      ) : data?.length === 0 ? (
        <p className="flex h-64 items-center text-body text-muted-foreground">
          {t("dashboard.chart_empty")}
        </p>
      ) : (
        // Recharts lays out left to right; the axis stays LTR in Arabic too.
        <div dir="ltr">
          <Suspense fallback={<Skeleton className="h-64" aria-hidden="true" />}>
            {data && <Impl kind={kind} data={data} series={series} />}
          </Suspense>
        </div>
      )}
    </section>
  )
}
