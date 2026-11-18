import type { EventType } from "@sayaratak/shared/schemas/api"
import type { EventRow } from "./types"

const HOUR_MS = 3_600_000

// How busy each Khartoum hour is: quiet nights, a morning and an evening peak. The seed spreads its last days' counts over it, so the heatmap has a believable shape.
const CURVE = [
  1, 0, 0, 0, 0, 1, 2, 4, 6, 8, 9, 9, 8, 7, 6, 6, 7, 8, 10, 11, 10, 8, 5, 2,
]
const CURVE_SUM = CURVE.reduce((a, b) => a + b, 0)

/** A day count spread over 24 hours by the curve; the parts add up to the count (largest remainders). */
export function spread(count: number) {
  const exact = CURVE.map((w) => (count * w) / CURVE_SUM)
  const parts = exact.map(Math.floor)
  const left = count - parts.reduce((a, b) => a + b, 0)
  const order = exact
    .map((v, i) => [v - Math.floor(v), i] as const)
    .sort((a, b) => b[0] - a[0])
  for (const [, i] of order.slice(0, left)) parts[i] = (parts[i] ?? 0) + 1
  return parts
}

const NO_HOURS: number[] = Array.from({ length: 24 }, () => 0)

/** The 24 hourly counts of a row's type; none kept reads as zeros (like an api day before hourly counters began). */
export const hoursOf = (row: EventRow, type: EventType) =>
  row.hours?.[type] ?? NO_HOURS

// The api keeps no hourly row for a zero count.
const hasHours = (e: EventRow) =>
  Object.values(e.hours ?? {}).some((hours) => hours.some(Boolean))

/** The first day any row has a non-zero hourly count for, or `null`. */
export const firstDayWithHours = (rows: EventRow[]) =>
  rows.reduce<string | null>(
    (first, e) => (hasHours(e) && (!first || e.day < first) ? e.day : first),
    null
  )

/** Adds one to the row's hour, giving the type its own hours first. */
export function bumpHour(row: EventRow, type: EventType, hour: number) {
  const hours = hoursOf(row, type).slice()
  hours[hour] = (hours[hour] ?? 0) + 1
  row.hours = { ...row.hours, [type]: hours }
}

/** The Khartoum hour now (UTC+2, no daylight saving). */
export const khartoumHour = (now = Date.now()) =>
  new Date(now + 2 * HOUR_MS).getUTCHours()
