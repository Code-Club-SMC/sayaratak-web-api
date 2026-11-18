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
  compare?: { label: string; values: number[] }
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
    ? data.map((row, i) => ({ ...row, compare: compare.values[i] ?? 0 }))
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
        />
        <ChartTooltip
          content={
            <ChartTooltipContent labelFormatter={(v) => label(String(v))} />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        {series.map((s) =>
          kind === "area" ? (
            <Area
              key={s.key}
              dataKey={s.key}
              type="monotone"
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
            type="monotone"
            stroke="var(--color-compare)"
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        )}
      </ComposedChart>
    </ChartContainer>
  )
}
