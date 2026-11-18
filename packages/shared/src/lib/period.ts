import type { Granularity, Period, PeriodQuery } from "../schemas/period"

// Wall-clock minutes are read as if they were UTC, so the arithmetic below never meets a zone.
const DAY_MS = 86_400_000
const LENGTHS = { "7d": 7, "30d": 30, "90d": 90 } as const
// Owner, 9.3 (O3): view and click counters stay per day for this month and the 12 before it.
const MONTHS_KEPT = 13

const ms = (minute: string) => Date.parse(`${minute}:00Z`)
const minuteAt = (t: number) => new Date(t).toISOString().slice(0, 16)
export const addDays = (day: string, n: number) =>
  new Date(Date.parse(day) + n * DAY_MS).toISOString().slice(0, 10)

/** The instant of a Khartoum wall-clock minute. Khartoum is UTC+2 all year (no daylight saving since 2017). */
export const instantOf = (minute: string) => Date.parse(`${minute}:00+02:00`)

/** The first day still counted per day. Example: any day in November 2026 gives `"2025-11-01"`. */
export function firstDailyDay(today: string) {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7)) - 1
  const first = year * 12 + month - (MONTHS_KEPT - 1)
  const mm = String((first % 12) + 1).padStart(2, "0")
  return `${Math.floor(first / 12)}-${mm}-01`
}

// The same minute a year earlier; 29 February becomes the 28th.
const yearBefore = (minute: string) =>
  `${Number(minute.slice(0, 4)) - 1}${minute.slice(4).replace("-02-29", "-02-28")}`

/** The Khartoum days a window touches, both included (`to` is exclusive). */
export const daysOf = (from: string, to: string) => ({
  first: from.slice(0, 10),
  last: minuteAt(ms(to) - 60_000).slice(0, 10),
})

/**
 * Resolves the query against `today` (a Khartoum day). Presets are whole days
 * ending today. Buckets: up to 92 days per day, up to 366 per week, longer per
 * month, and per month whenever the current window reaches the rolled-up
 * months.
 */
export function resolvePeriod(query: PeriodQuery, today: string): Period {
  const { from: f, to: t, compare } = query
  const custom = !!f && !!t && ms(f) < ms(t)
  const from =
    custom && f ? f : `${addDays(today, 1 - LENGTHS[query.range])}T00:00`
  const to = custom && t ? t : `${addDays(today, 1)}T00:00`
  const compareFrom =
    compare === "year" ? yearBefore(from) : minuteAt(2 * ms(from) - ms(to))
  const compareTo = compare === "year" ? yearBefore(to) : from
  const { first, last } = daysOf(from, to)
  const kept = firstDailyDay(today)
  const rolledUp = first < kept
  const length = (Date.parse(last) - Date.parse(first)) / DAY_MS + 1
  const granularity: Granularity =
    rolledUp || length > 366 ? "month" : length > 92 ? "week" : "day"
  return {
    from,
    to,
    compareFrom,
    compareTo,
    compare,
    granularity,
    custom,
    rolledUp,
    eventsCompared: rolledUp || compareFrom.slice(0, 10) >= kept,
  }
}

const nextMonth = (day: string) => {
  const y = Number(day.slice(0, 4))
  const m = Number(day.slice(5, 7))
  return m === 12
    ? `${y + 1}-01-01`
    : `${y}-${String(m + 1).padStart(2, "0")}-01`
}

/** The first day of each bucket from `first` to `last`. Weeks count from `first`; months are calendar months, the first one starting at `first`. */
export function bucketsOf(
  first: string,
  last: string,
  granularity: Granularity
) {
  const starts: string[] = []
  for (let day = first; day <= last; ) {
    starts.push(day)
    day =
      granularity === "day"
        ? addDays(day, 1)
        : granularity === "week"
          ? addDays(day, 7)
          : nextMonth(day)
  }
  return starts
}

/** Adds `[day, value]` pairs into the buckets; days before the first start or after `last` are dropped. */
export function sumInto(
  starts: string[],
  last: string,
  pairs: Iterable<[string, number]>
) {
  const sums = starts.map(() => 0)
  for (const [day, value] of pairs) {
    if (day < (starts[0] ?? "") || day > last) continue
    let i = starts.length - 1
    while ((starts[i] ?? "") > day) i--
    sums[i] = (sums[i] ?? 0) + value
  }
  return sums
}

/** Pads with zeros or cuts so the compare series lines up with the current one. */
export const alignTo = (values: number[], length: number) =>
  Array.from({ length }, (_, i) => values[i] ?? 0)

/** The compare window's bucket starts cut or padded to `length`; a padded bucket repeats the last start (it holds zeros). */
export const alignStarts = (starts: string[], length: number) =>
  Array.from({ length }, (_, i) => starts[i] ?? starts[starts.length - 1] ?? "")
