import type { ChartCardProps, ChartRow } from "@/components/app/chart-card"
import type { Period } from "@sayaratak/shared/schemas/period"

type T = (key: string) => string

// The report props of a ChartCard. `events`: the chart shows view, call or WhatsApp counts, so its compare line is dropped when the compare window only has monthly totals (owner, 2026-11-18).
export function reportChart(input: {
  t: T
  period?: Period
  rows?: ChartRow[]
  previous?: ChartRow[]
  events?: boolean
}): Pick<ChartCardProps, "data" | "previous" | "compareLabel" | "granularity"> {
  const { t, period, rows, previous, events } = input
  return {
    data: rows,
    previous: events && period?.eventsCompared === false ? undefined : previous,
    compareLabel: period && t(`dashboard.series_compare_${period.compare}`),
    granularity: period?.granularity ?? "day",
  }
}

// Analytics buckets keyed the way ChartCard reads them.
export const dayRows = <TRow extends { date: string }>(rows?: TRow[]) =>
  rows?.map(({ date, ...rest }) => ({ day: date, ...rest }))
