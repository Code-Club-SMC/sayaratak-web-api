import {
  alignStarts,
  alignTo,
  bucketsOf,
  daysOf,
  resolvePeriod,
  sumInto,
} from "@sayaratak/shared/lib/period"
import type { Period, PeriodQuery } from "@sayaratak/shared/schemas/period"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import { dayOf } from "~/shared/time/khartoum"

import { type Counts, groupByDay } from "./analytics.mapper"
import * as q from "./analytics.queries"

/** One window of a report: its days, its exact minutes and its bucket starts. */
export type Window = {
  first: string
  last: string
  from: string
  to: string
  starts: string[]
}

/**
 * The period of a report query (step 11.7-r1) and both of its windows: the
 * current one and the one it is compared with. Shared with the mock, so both
 * resolve the same presets, custom minutes and buckets.
 */
export function windowsOf(query: PeriodQuery) {
  const period = resolvePeriod(query, dayOf(clock.now()))
  const window = (from: string, to: string): Window => {
    const { first, last } = daysOf(from, to)
    return {
      first,
      last,
      from,
      to,
      starts: bucketsOf(first, last, period.granularity),
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

/** Per-day values added into the window's buckets. */
export const bucket = (w: Window, byDay: Map<string, number>) =>
  sumInto(w.starts, w.last, byDay)

/**
 * Page counters per day for these targets in the window. Days older than the
 * 13 months kept per day only exist per month; when the period reaches them,
 * each month row counts on the first day of that month the window holds.
 */
export async function countsPerDay(
  targetIds: string[] | null,
  w: Window,
  period: Period
): Promise<Map<string, Counts>> {
  if (targetIds?.length === 0) return new Map()
  const [daily, monthly] = await Promise.all([
    q.listDailyCounts(db, targetIds, w),
    period.rolledUp ? q.listMonthlyCounts(db, targetIds, w) : [],
  ])
  return groupByDay([
    ...daily,
    ...monthly.map(({ month, ...row }) => ({
      ...row,
      // biome-ignore lint/complexity/useMathMinMax: ISO day strings, not numbers
      day: month < w.first ? w.first : month,
    })),
  ])
}

/** One counter of a per-day map, for `bucket`. */
export const pick = (byDay: Map<string, Counts>, key: keyof Counts) =>
  new Map([...byDay].map(([day, counts]) => [day, counts[key]]))

export const total = (values: number[]) => values.reduce((a, b) => a + b, 0)
