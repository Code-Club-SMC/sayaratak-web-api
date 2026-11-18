import { lazy, Suspense, useId, useState } from "react"
import { ChartNoAxesColumnIcon, DownloadIcon } from "lucide-react"

import { downloadCsv } from "@/lib/csv"
import { formatBucket } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { Granularity } from "@sayaratak/shared/schemas/period"
import { ChartTable } from "./chart-table"
import { EmptyState } from "./empty-state"

export type ChartSeries = { key: string; label: string }
// `null`: nothing to measure in that bucket (an average with no items); the chart leaves a gap and the table a dash.
export type ChartRow = { day: string } & Record<string, number | string | null>

export type ChartCardProps = {
  title: string
  data?: ChartRow[]
  series: ChartSeries[]
  // Bars of one day pile up instead of standing side by side.
  stacked?: boolean
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  // Report pages: the compare window lined up with `data` (drawn as one dashed line of its series' total), how wide a bucket is, and the CSV file name. Without `granularity` the card has no table view or CSV.
  previous?: ChartRow[]
  compareLabel?: string
  granularity?: Granularity
  csvName?: string
}

// Recharts is heavy, so it loads on first render of a chart and never in a page's own chunk.
const Impl = lazy(() =>
  import("./chart-impl").then((m) => ({ default: m.ChartImpl }))
)

const sumOf = (row: ChartRow | undefined, series: ChartSeries[]) =>
  series.every((s) => row?.[s.key] === null)
    ? null
    : series.reduce((total, s) => total + Number(row?.[s.key] ?? 0), 0)

// Shared by AreaChartCard and BarChartCard: title, loading skeleton, error with retry, empty line; on report pages also the chart/table switch and CSV.
export function ChartCard({
  kind,
  title,
  data,
  series,
  stacked,
  loading,
  error,
  onRetry,
  previous,
  compareLabel,
  granularity,
  csvName,
}: ChartCardProps & { kind: "area" | "bar" }) {
  const { t, locale } = useT()
  const id = useId()
  const [view, setView] = useState<"chart" | "table">("chart")
  const label = (day: string) =>
    granularity === "week"
      ? t("dashboard.bucket_week", { date: formatBucket(day, "week", locale) })
      : formatBucket(day, granularity ?? "day", locale)
  const compare =
    previous && compareLabel && data
      ? {
          label: compareLabel,
          values: data.map((_, i) => sumOf(previous[i], series)),
        }
      : undefined
  const ready = !error && !loading && !!data?.length
  const exportCsv = () =>
    data &&
    downloadCsv(`${csvName ?? title}.csv`, [
      [
        t("dashboard.col_period"),
        ...series.map((s) => s.label),
        ...(compare ? [compare.label] : []),
      ],
      ...data.map((row, i) => [
        row.day,
        ...series.map((s) =>
          row[s.key] === null ? "" : Number(row[s.key] ?? 0)
        ),
        ...(compare ? [compare.values[i] ?? ""] : []),
      ]),
    ])
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="text-body font-semibold">
          {title}
        </h2>
        {granularity && ready && (
          <div className="flex items-center gap-2">
            <ToggleGroup
              aria-label={t("dashboard.view_label")}
              variant="outline"
              size="sm"
              value={[view]}
              onValueChange={(next) =>
                next[0] && setView(next[0] === "table" ? "table" : "chart")
              }
            >
              <ToggleGroupItem value="chart">
                {t("dashboard.view_chart")}
              </ToggleGroupItem>
              <ToggleGroupItem value="table">
                {t("dashboard.view_table")}
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("dashboard.csv", { name: title })}
              onClick={exportCsv}
            >
              <DownloadIcon aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>
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
        <EmptyState
          icon={ChartNoAxesColumnIcon}
          title={t("dashboard.chart_empty")}
          level={3}
          className="h-64"
        />
      ) : view === "table" && data ? (
        <ChartTable
          data={data}
          series={series}
          label={label}
          compare={compare}
        />
      ) : (
        // Recharts lays out left to right; the axis stays LTR in Arabic too.
        <div dir="ltr">
          <Suspense fallback={<Skeleton className="h-64" aria-hidden="true" />}>
            {data && (
              <Impl
                kind={kind}
                data={data}
                series={series}
                stacked={stacked}
                label={label}
                compare={compare}
              />
            )}
          </Suspense>
        </div>
      )}
    </section>
  )
}
