import { and, between, inArray, min, or, type SQL, sql, sum } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { PAGE_TYPES } from "./analytics.queries"
import { eventsHourly } from "./analytics.tables"

// Hourly counters (step 11.7-r2): written next to the daily row, kept 90 days.

/** Adds one to the hourly counter of the target, Khartoum day, hour and type. */
export function bumpHourly(
  ex: Executor,
  event: Pick<
    typeof eventsHourly.$inferInsert,
    "day" | "hour" | "targetId" | "type"
  >
) {
  return ex
    .insert(eventsHourly)
    .values({ ...event, count: 1 })
    .onConflictDoUpdate({
      target: [
        eventsHourly.targetId,
        eventsHourly.day,
        eventsHourly.hour,
        eventsHourly.type,
      ],
      set: { count: sql`${eventsHourly.count} + 1` },
    })
}

/**
 * Hourly page counters per type for these targets (`null`: all) inside the
 * hour ranges (Khartoum hour starts, end excluded), keyed by day, or by hour
 * key (`"2026-11-02T08:00"`) when `perHour`.
 */
export function listHourlyCounts(
  ex: Executor,
  input: { targetIds: string[] | null; ranges: string[][]; perHour: boolean }
) {
  const key = input.perHour
    ? sql<string>`to_char(${eventsHourly.day}, 'YYYY-MM-DD') || 'T' || lpad(${eventsHourly.hour}::text, 2, '0') || ':00'`
    : sql<string>`to_char(${eventsHourly.day}, 'YYYY-MM-DD')`
  return ex
    .select({
      day: key,
      type: eventsHourly.type,
      count: sum(eventsHourly.count).mapWith(Number),
    })
    .from(eventsHourly)
    .where(
      and(
        inHours(input.ranges),
        inArray(eventsHourly.type, [...PAGE_TYPES]),
        input.targetIds
          ? inArray(eventsHourly.targetId, input.targetIds)
          : undefined
      )
    )
    .groupBy(key, eventsHourly.type)
}

/** Hourly page counters per target and type inside the hour ranges. */
export function listTargetHourlyCounts(
  ex: Executor,
  input: { targetIds: string[]; ranges: string[][] }
) {
  return ex
    .select({
      targetId: eventsHourly.targetId,
      type: eventsHourly.type,
      count: sum(eventsHourly.count).mapWith(Number),
    })
    .from(eventsHourly)
    .where(
      and(
        inHours(input.ranges),
        inArray(eventsHourly.type, [...PAGE_TYPES]),
        inArray(eventsHourly.targetId, input.targetIds)
      )
    )
    .groupBy(eventsHourly.targetId, eventsHourly.type)
}

/** Call and WhatsApp taps per weekday (0 is Sunday) and hour for these targets inside the hour range. */
export function listContactWeekdayHours(
  ex: Executor,
  input: { targetIds: string[] | null; range: string[] }
) {
  const weekday = sql<number>`extract(dow from ${eventsHourly.day})::int`
  return ex
    .select({
      weekday,
      hour: eventsHourly.hour,
      count: sum(eventsHourly.count).mapWith(Number),
    })
    .from(eventsHourly)
    .where(
      and(
        inHours([input.range]),
        inArray(eventsHourly.type, ["phone_click", "whatsapp_click"]),
        input.targetIds
          ? inArray(eventsHourly.targetId, input.targetIds)
          : undefined
      )
    )
    .groupBy(weekday, eventsHourly.hour)
}

/** The first day any hourly counter is kept for, or `null` when none is. */
export async function firstHourlyDay(ex: Executor) {
  const [row] = await ex
    .select({ day: min(eventsHourly.day) })
    .from(eventsHourly)
  return row?.day ?? null
}

// Rows whose Khartoum hour start falls inside one of the ranges. The day bounds let the day index narrow the scan.
function inHours(ranges: string[][]) {
  const start = sql`(${eventsHourly.day} + ${eventsHourly.hour} * interval '1 hour')`
  const parts: SQL[] = []
  for (const [from = "", to = ""] of ranges) {
    const part = and(
      between(eventsHourly.day, from.slice(0, 10), to.slice(0, 10)),
      sql`${start} >= ${from}::timestamp and ${start} < ${to}::timestamp`
    )
    if (part) parts.push(part)
  }
  return parts.length ? or(...parts) : sql`false`
}
