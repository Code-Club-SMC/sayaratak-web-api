import {
  alignStarts,
  alignTo,
  bucketsOf,
  daysOf,
  instantOf,
  resolvePeriod,
  sumInto,
} from "@sayaratak/shared/lib/period"
import { periodQuerySchema } from "@sayaratak/shared/schemas/period"
import { db } from "./db"
import { dayKey } from "./lib"

const HOUR_MS = 3_600_000
type EventKey = keyof (typeof db.events)[number]["counts"]

// The period of a report query and both of its windows. Event rows are per day, so they count by the days a window touches; timestamps count by the exact minutes. Matches the api (step 11.7-r1).
export function periodOf(query: URLSearchParams) {
  const period = resolvePeriod(
    periodQuerySchema.parse(Object.fromEntries(query)),
    dayKey()
  )
  const window = (from: string, to: string) => {
    const { first, last } = daysOf(from, to)
    const starts = bucketsOf(first, last, period.granularity)
    const start = instantOf(from)
    const end = instantOf(to)
    const has = (iso: string) => {
      const t = Date.parse(iso)
      return t >= start && t < end
    }
    const rows = (match: (targetId: string) => boolean) =>
      db.events.filter(
        (e) => match(e.targetId) && e.day >= first && e.day <= last
      )
    return {
      starts,
      has,
      /** Event counts of the matching targets, in total and per bucket. */
      events: (match: (targetId: string) => boolean, key: EventKey) => {
        const found = rows(match)
        const series = sumInto(
          starts,
          last,
          found.map((e): [string, number] => [e.day, e.counts[key]])
        )
        return { total: series.reduce((a, b) => a + b, 0), series }
      },
      /** Rows with a timestamp inside the window, valued per bucket by their Khartoum day. */
      timed: <T>(items: T[], at: (r: T) => string, value: (r: T) => number) =>
        sumInto(
          starts,
          last,
          items
            .filter((r) => has(at(r)))
            .map((r): [string, number] => [
              dayKey(Date.parse(at(r)) + 2 * HOUR_MS),
              value(r),
            ])
        ),
    }
  }
  const current = window(period.from, period.to)
  const compare = window(period.compareFrom, period.compareTo)
  return {
    period,
    current,
    compare,
    /** Lines the compare series up with the current one. */
    align: (values: number[]) => alignTo(values, current.starts.length),
    compareStarts: alignStarts(compare.starts, current.starts.length),
  }
}

export const total = (values: number[]) => values.reduce((a, b) => a + b, 0)
