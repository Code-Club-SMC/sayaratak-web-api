import {
  alignStarts,
  alignTo,
  bucketsOf,
  daysOf,
  firstHourlyDay,
  hoursOf,
  resolvePeriod,
  slicesOf,
  sumInto,
} from "@sayaratak/shared/lib/period"
import type { Period, PeriodQuery } from "@sayaratak/shared/schemas/period"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import { dayOf } from "~/shared/time/khartoum"

import { type Counts, groupByDay } from "./analytics.mapper"
import * as hourly from "./analytics.hourly.queries"
import * as q from "./analytics.queries"

/** One window of a report: its days, its exact minutes, its bucket starts (hour keys when `hourly`) and the Khartoum day it was resolved on. */
export type Window = {
  first: string
  last: string
  from: string
  to: string
  starts: string[]
  hourly: boolean
  today: string
}

/**
 * The period of a report query (step 11.7-r1) and both of its windows: the
 * current one and the one it is compared with. Shared with the mock, so both
 * resolve the same presets, custom minutes and buckets.
 */
export function windowsOf(query: PeriodQuery) {
  const today = dayOf(clock.now())
  const period = resolvePeriod(query, today)
  const hourly = period.granularity === "hour"
  const window = (from: string, to: string): Window => {
    const { first, last } = daysOf(from, to)
    return {
      first,
      last,
      from,
      to,
      starts: hourly
        ? hoursOf(from, to)
        : bucketsOf(first, last, period.granularity),
      hourly,
      today,
    }
  }
  const current = window(period.from, period.to)
  const compare = window(period.compareFrom, period.compareTo)
  return {
    period,
    current,
    compare,
    /** Cuts or pads compare values to the current bucket count. */
    align: (values: number[]) => alignTo(values, current.starts.length),
    compareStarts: alignStarts(compare.starts, current.starts.length),
  }
}

/** Per-day (or per-hour) values added into the window's buckets. */
export const bucket = (w: Window, byDay: Map<string, number>) =>
  sumInto(w.starts, w.hourly ? (w.starts.at(-1) ?? "") : w.last, byDay)

/**
 * Page counters per day (per hour key for hour buckets) for these targets in
 * the window. Partial start and end days inside the 90 days kept per hour
 * read the hourly rows of their hours (step 11.7-r2). Days older than the 13
 * months kept per day only exist per month; when the period reaches them,
 * each month row counts on the first day of that month the window holds.
 */
export async function countsPerDay(
  targetIds: string[] | null,
  w: Window,
  period: Period
): Promise<Map<string, Counts>> {
  if (targetIds?.length === 0) return new Map()
  const slices = slicesOf(w)
  const [daily, hours, monthly] = await Promise.all([
    slices.days ? q.listDailyCounts(db, targetIds, slices.days) : [],
    slices.hours.length
      ? hourly.listHourlyCounts(db, {
          targetIds,
          ranges: slices.hours,
          perHour: w.hourly,
        })
      : [],
    period.rolledUp ? q.listMonthlyCounts(db, targetIds, w) : [],
  ])
  return groupByDay([
    ...daily,
    ...hours,
    ...monthly.map(({ month, ...row }) => ({
      ...row,
      // biome-ignore lint/complexity/useMathMinMax: ISO day strings, not numbers
      day: month < w.first ? w.first : month,
    })),
  ])
}

/**
 * The first day hourly counters exist for: 89 days before today, or the first
 * day any hourly row was written when that is later (the table started empty
 * on deploy, owner step 11.7-r2).
 */
export async function hourlySinceOf(today: string) {
  const kept = firstHourlyDay(today)
  const first = (await hourly.firstHourlyDay(db)) ?? today
  // biome-ignore lint/complexity/useMathMinMax: ISO day strings, not numbers
  return first > kept ? first : kept
}

/** One counter of a per-day map, for `bucket`. */
export const pick = (byDay: Map<string, Counts>, key: keyof Counts) =>
  new Map([...byDay].map(([day, counts]) => [day, counts[key]]))

export const total = (values: number[]) => values.reduce((a, b) => a + b, 0)
