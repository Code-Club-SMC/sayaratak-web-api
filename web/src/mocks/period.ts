import {
  alignStarts,
  alignTo,
  bucketsOf,
  ceilHour,
  daysOf,
  firstHourlyDay,
  floorHour,
  hourKey,
  hoursOf,
  instantOf,
  resolvePeriod,
  slicesOf,
  sumInto,
} from "@sayaratak/shared/lib/period"
import { periodQuerySchema } from "@sayaratak/shared/schemas/period"
import type { EventType } from "@sayaratak/shared/schemas/api"
import { db } from "./db"
import { firstDayWithHours, hoursOf as hoursOfRow } from "./event-hours"
import { dayKey } from "./lib"

const HOUR_MS = 3_600_000
type EventKey = keyof (typeof db.events)[number]["counts"]

// The Khartoum minute of an ISO timestamp (UTC+2, no daylight saving).
const minuteOf = (iso: string) =>
  new Date(Date.parse(iso) + 2 * HOUR_MS).toISOString().slice(0, 16)

// Event rows inside the hour ranges, as [day or hour key, count] pairs.
function hourPairs(
  match: (targetId: string) => boolean,
  key: EventType,
  ranges: string[][],
  perHour: boolean
) {
  const pairs: [string, number][] = []
  for (const [from = "", to = ""] of ranges)
    for (const e of db.events) {
      if (!match(e.targetId)) continue
      if (e.day < from.slice(0, 10) || e.day > to.slice(0, 10)) continue
      hoursOfRow(e, key).forEach((count, hour) => {
        const at = hourKey(e.day, hour)
        if (count && at >= from && at < to)
          pairs.push([perHour ? at : e.day, count])
      })
    }
  return pairs
}

// The period of a report query and both of its windows. Whole days read the day rows, partial days inside the 90 days kept per hour and hour buckets read the hours; timestamps count by the exact minutes. Matches the api (steps 11.7-r1, r2).
export function periodOf(query: URLSearchParams) {
  const today = dayKey()
  const period = resolvePeriod(
    periodQuerySchema.parse(Object.fromEntries(query)),
    today
  )
  const hourly = period.granularity === "hour"
  const window = (from: string, to: string) => {
    const { first, last } = daysOf(from, to)
    const starts = hourly
      ? hoursOf(from, to)
      : bucketsOf(first, last, period.granularity)
    const end = hourly ? (starts.at(-1) ?? "") : last
    const slices = slicesOf({ from, to, today, hourly })
    const start = instantOf(from)
    const stop = instantOf(to)
    const has = (iso: string) => {
      const t = Date.parse(iso)
      return t >= start && t < stop
    }
    return {
      starts,
      has,
      from,
      to,
      last,
      /** Event counts of the matching targets, in total and per bucket. */
      events: (match: (targetId: string) => boolean, key: EventKey) => {
        const days = slices.days
        const daily = days
          ? db.events
              .filter(
                (e) =>
                  match(e.targetId) && e.day >= days.first && e.day <= days.last
              )
              .map((e): [string, number] => [e.day, e.counts[key]])
          : []
        const series = sumInto(starts, end, [
          ...daily,
          ...hourPairs(match, key, slices.hours, hourly),
        ])
        return { total: series.reduce((a, b) => a + b, 0), series }
      },
      /** Rows with a timestamp inside the window, valued per bucket by their Khartoum day (or hour). */
      timed: <T>(items: T[], at: (r: T) => string, value: (r: T) => number) =>
        sumInto(
          starts,
          end,
          items
            .filter((r) => has(at(r)))
            .map((r): [string, number] => {
              const minute = minuteOf(at(r))
              return [
                hourly ? floorHour(minute) : minute.slice(0, 10),
                value(r),
              ]
            })
        ),
    }
  }
  const current = window(period.from, period.to)
  const compare = window(period.compareFrom, period.compareTo)
  return {
    period,
    current,
    compare,
    /** The first day hourly counts exist for: 89 days back, or the first day with hours if later (matches the api). */
    hourlySince:
      [firstHourlyDay(today), firstDayWithHours(db.events) ?? today]
        .sort()
        .at(-1) ?? today,
    /** Lines the compare series up with the current one. */
    align: (values: number[]) => alignTo(values, current.starts.length),
    compareStarts: alignStarts(compare.starts, current.starts.length),
  }
}

/**
 * Calls, WhatsApp taps and messages per Khartoum weekday (0 is Sunday) and
 * hour, from `since` to the end of the window: index `weekday * 24 + hour`.
 */
export function contactHours(input: {
  w: ReturnType<typeof periodOf>["current"]
  since: string
  match: (targetId: string) => boolean
  messages: { createdAt: string }[]
}) {
  const { w, match } = input
  const cells: number[] = Array.from({ length: 168 }, () => 0)
  const sinceMinute = `${input.since}T00:00`
  const from = w.from > sinceMinute ? w.from : sinceMinute
  if (from >= w.to) return cells
  const add = (key: string, count: number) => {
    const weekday = new Date(`${key.slice(0, 10)}T12:00:00Z`).getUTCDay()
    const i = weekday * 24 + Number(key.slice(11, 13))
    cells[i] = (cells[i] ?? 0) + count
  }
  const range = [[floorHour(from), ceilHour(w.to)]]
  for (const type of ["phone_click", "whatsapp_click"] as const)
    for (const [key, count] of hourPairs(match, type, range, true))
      add(key, count)
  const start = instantOf(from)
  const stop = instantOf(w.to)
  for (const m of input.messages) {
    const t = Date.parse(m.createdAt)
    if (t >= start && t < stop) add(minuteOf(m.createdAt), 1)
  }
  return cells
}

export const total = (values: number[]) => values.reduce((a, b) => a + b, 0)
