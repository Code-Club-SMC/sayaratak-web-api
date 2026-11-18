import type { Granularity, Period, PeriodQuery } from "../schemas/period"

// Wall-clock minutes are read as if they were UTC, so the arithmetic below never meets a zone.
const DAY_MS = 86_400_000
const HOUR_MS = 3_600_000
const LENGTHS = { "7d": 7, "30d": 30, "90d": 90 } as const
// Owner, 9.3 (O3): view and click counters stay per day for this month and the 12 before it.
const MONTHS_KEPT = 13
// Owner, step 11.7-r2: view and click counters are also kept per hour for 90 days.
const HOURLY_DAYS = 90
// Hour buckets for windows of up to 2 days.
const HOURLY_SPAN_MS = 2 * DAY_MS

const ms = (minute: string) => Date.parse(`${minute}:00Z`)
const minuteAt = (t: number) => new Date(t).toISOString().slice(0, 16)
export const addDays = (day: string, n: number) =>
  new Date(Date.parse(day) + n * DAY_MS).toISOString().slice(0, 10)

/** The instant of a Khartoum wall-clock minute. Khartoum is UTC+2 all year (no daylight saving since 2017). */
export const instantOf = (minute: string) => Date.parse(`${minute}:00+02:00`)

/** The Khartoum wall-clock minute of an ISO instant: `"2026-11-01T06:30:00Z"` gives `"2026-11-01T08:30"`. */
export const minuteOf = (iso: string) => minuteAt(Date.parse(iso) + 2 * HOUR_MS)

/** The Khartoum minute `days` (may be fractional) after a minute. */
export const addMinutesDays = (minute: string, days: number) =>
  minuteAt(ms(minute) + days * DAY_MS)

/** Days (fractional) from one minute to another. */
export const daysBetweenMinutes = (from: string, to: string) =>
  (ms(to) - ms(from)) / DAY_MS

/** The first day still counted per day. Example: any day in November 2026 gives `"2025-11-01"`. */
export function firstDailyDay(today: string) {
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7)) - 1
  const first = year * 12 + month - (MONTHS_KEPT - 1)
  const mm = String((first % 12) + 1).padStart(2, "0")
  return `${Math.floor(first / 12)}-${mm}-01`
}

/** The first day still counted per hour. Example: `"2026-11-18"` gives `"2026-08-21"` (90 days with today). */
export const firstHourlyDay = (today: string) => addDays(today, 1 - HOURLY_DAYS)

/** The start of the hour a minute falls in: `"2026-11-01T08:30"` gives `"2026-11-01T08:00"`. */
export const floorHour = (minute: string) => `${minute.slice(0, 13)}:00`

/** The first hour start at or after a minute: `"2026-11-01T08:30"` gives `"2026-11-01T09:00"`. */
export const ceilHour = (minute: string) =>
  minute.endsWith(":00") ? minute : minuteAt(ms(floorHour(minute)) + HOUR_MS)

/** The hour key of a Khartoum day and hour: `("2026-11-01", 8)` gives `"2026-11-01T08:00"`. */
export const hourKey = (day: string, hour: number) =>
  `${day}T${String(hour).padStart(2, "0")}:00`

/** The start of each hour a window touches (`to` is exclusive). */
export function hoursOf(from: string, to: string) {
  const starts: string[] = []
  const end = ms(ceilHour(to))
  for (let t = ms(floorHour(from)); t < end; t += HOUR_MS)
    starts.push(minuteAt(t))
  return starts
}

/**
 * Which counter rows a window reads (step 11.7-r2). `hours`: hour ranges
 * (start included, end excluded) read per hour; `days`: whole days read per
 * day. Partial start and end days inside the 90 days kept per hour are read
 * per hour, older ones as whole days. `hourly`: read everything per hour
 * (hour buckets).
 */
export function slicesOf(input: {
  from: string
  to: string
  today: string
  hourly: boolean
}) {
  const fromH = floorHour(input.from)
  const toH = ceilHour(input.to)
  if (input.hourly) return { days: null, hours: [[fromH, toH]] }
  const kept = firstHourlyDay(input.today)
  const a = fromH.slice(0, 10)
  const b = minuteAt(ms(toH) - HOUR_MS).slice(0, 10)
  const firstPart = !fromH.endsWith("T00:00") && a >= kept
  const lastPart = !toH.endsWith("T00:00") && b >= kept
  if (a === b && (firstPart || lastPart))
    return { days: null, hours: [[fromH, toH]] }
  const hours: string[][] = []
  if (firstPart) hours.push([fromH, `${addDays(a, 1)}T00:00`])
  if (lastPart) hours.push([`${b}T00:00`, toH])
  const first = firstPart ? addDays(a, 1) : a
  const last = lastPart ? addDays(b, -1) : b
  return { days: first <= last ? { first, last } : null, hours }
}

// A partial start or end day older than the hours kept, so it counts whole.
const touchesOldPartDay = (from: string, to: string, today: string) => {
  const kept = firstHourlyDay(today)
  const toH = ceilHour(to)
  return (
    (!floorHour(from).endsWith("T00:00") && from.slice(0, 10) < kept) ||
    (!toH.endsWith("T00:00") && minuteAt(ms(toH) - HOUR_MS).slice(0, 10) < kept)
  )
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
 * ending today. Buckets: per hour up to 2 days inside the 90 days kept per
 * hour, up to 92 days per day, up to 366 per week, longer per month, and per
 * month whenever the current window reaches the rolled-up months.
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
  const hourly =
    ms(to) - ms(from) <= HOURLY_SPAN_MS && first >= firstHourlyDay(today)
  const granularity: Granularity =
    rolledUp || length > 366
      ? "month"
      : length > 92
        ? "week"
        : hourly
          ? "hour"
          : "day"
  return {
    from,
    to,
    compareFrom,
    compareTo,
    compare,
    granularity,
    custom,
    rolledUp,
    // Hour buckets compare per hour, so a compare window older than the hours kept has nothing to compare.
    eventsCompared:
      granularity === "hour"
        ? compareFrom.slice(0, 10) >= firstHourlyDay(today)
        : rolledUp || compareFrom.slice(0, 10) >= kept,
    wholeDays:
      granularity !== "hour" &&
      (touchesOldPartDay(from, to, today) ||
        touchesOldPartDay(compareFrom, compareTo, today)),
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

/** Adds `[day, value]` pairs into the buckets; days before the first start or after `last` are dropped. Hour buckets take `[hour key, value]` pairs and the last hour key. */
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

/** Report buckets: their starts, the last key they hold (the last start for hours, the last day otherwise) and whether keys are hours. */
export type Buckets = { starts: string[]; end: string; hourly: boolean }

/** Adds `[ISO instant, value]` pairs into the buckets by Khartoum day (or hour). The caller keeps only instants inside the window. */
export const sumTimed = (b: Buckets, pairs: [string, number][]) =>
  sumInto(
    b.starts,
    b.end,
    pairs.map(([iso, value]): [string, number] => {
      const minute = minuteOf(iso)
      return [b.hourly ? floorHour(minute) : minute.slice(0, 10), value]
    })
  )

/** Whether an ISO instant falls inside the Khartoum minutes `[from, to)`. */
export const within = (iso: string, from: string, to: string) => {
  const t = Date.parse(iso)
  return t >= instantOf(from) && t < instantOf(to)
}
