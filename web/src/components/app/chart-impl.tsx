import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts"

import { useT } from "@/lib/i18n/use-t"
import { formatNumber } from "@/lib/format"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { ChartRow, ChartSeries } from "./chart-card"

// chart-2 is --signal, which only means "paid", so series skip it.
const colors = [1, 3, 4, 5] as const

// The only file besides ui/chart that imports Recharts, so ChartCard can load it lazily.
export function ChartImpl({
  kind,
  data,
  series,
  stacked,
  label,
  compare,
}: {
  kind: "area" | "bar"
  data: ChartRow[]
  series: ChartSeries[]
  stacked?: boolean
  label: (day: string) => string
  // The compare window's total per bucket, drawn as one dashed muted line.
  compare?: { label: string; values: (number | null)[] }
}) {
  const { locale } = useT()
  const config: ChartConfig = {
    ...Object.fromEntries(
      series.map((s, i) => [
        s.key,
        { label: s.label, color: `var(--chart-${colors[i % colors.length]})` },
      ])
    ),
    ...(compare && {
      compare: { label: compare.label, color: "var(--muted-foreground)" },
    }),
  }
  const rows = compare
    ? data.map((row, i) => ({ ...row, compare: compare.values[i] ?? null }))
    : data
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <ComposedChart data={rows} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          tickFormatter={(v: string) => label(v)}
        />
        <YAxis
          // Fits the widest tick, so six-figure SDG amounts are not cut off.
          width="auto"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatNumber(v, locale)}
          // Counts are whole: no 0.25 or 0.75 ticks on a chart of sign-ups.
          allowDecimals={false}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              // Room between a series name and its number ("Previous period   0"), set from here since ui/chart stays as shipped.
              className="min-w-44 [&_.justify-between]:gap-6"
              labelFormatter={(v) => label(String(v))}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((s) =>
          kind === "area" ? (
            <Area
              key={s.key}
              dataKey={s.key}
              // Straight segments: a smoothed curve invents humps between whole-number days.
              type="linear"
              strokeWidth={2}
              stroke={`var(--color-${s.key})`}
              fill={`var(--color-${s.key})`}
              fillOpacity={0.12}
              isAnimationActive={false}
            />
          ) : (
            <Bar
              key={s.key}
              dataKey={s.key}
              fill={`var(--color-${s.key})`}
              stackId={stacked ? "stack" : undefined}
              radius={stacked ? 0 : [2, 2, 0, 0]}
              isAnimationActive={false}
            />
          )
        )}
        {compare && (
          <Line
            dataKey="compare"
            type="linear"
            stroke="var(--color-compare)"
            strokeWidth={1.25}
            strokeOpacity={0.6}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
