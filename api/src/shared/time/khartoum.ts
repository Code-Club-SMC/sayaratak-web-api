import { type SQL, sql } from "drizzle-orm"
import type { PgColumn } from "drizzle-orm/pg-core"

// The one calendar the product counts days in (A1 rule 7). Postgres does the
// zone math, so no offset is written down here. The zone is written into the
// SQL text, not sent as a parameter: a `group by` on the day column must read
// the same as the selected one.
const ZONE = "Africa/Khartoum"
const SQL_ZONE = sql.raw(`'${ZONE}'`)
const DAY_MS = 86_400_000

const dayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: ZONE })
const hourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  hour: "2-digit",
  hourCycle: "h23",
})

/** The Khartoum calendar day of an instant. Example: 22:30 UTC on 2026-11-01 is `"2026-11-02"`. */
export function dayOf(at: Date) {
  return dayFormat.format(at)
}

/** The Khartoum hour of an instant, 0 to 23. Example: 22:30 UTC is `0` (00:30 the next day). */
export function hourOf(at: Date) {
  return Number(hourFormat.format(at))
}

/** The day `count` days before `day` (`"2026-11-02"`, 2 gives `"2026-10-31"`). */
export function daysBefore(day: string, count: number) {
  return new Date(Date.parse(day) - count * DAY_MS).toISOString().slice(0, 10)
}

/** The `length` days up to and including `last`, oldest first. */
export function daysUpTo(last: string, length: number) {
  return Array.from({ length }, (_, i) => daysBefore(last, length - 1 - i))
}

/** The Khartoum day of a timestamp column or expression, as text (`"2026-11-02"`). */
export function dayColumn(column: PgColumn | SQL) {
  return sql<string>`to_char(${column} at time zone ${SQL_ZONE}, 'YYYY-MM-DD')`
}

/**
 * The report bucket key of a timestamp: its Khartoum day (`"2026-11-02"`), or
 * its Khartoum hour (`"2026-11-02T08:00"`) when the range has hour buckets.
 */
export function bucketColumn(column: PgColumn | SQL, days: DayRange) {
  return days.hourly
    ? sql<string>`to_char(${column} at time zone ${SQL_ZONE}, 'YYYY-MM-DD"T"HH24:00')`
    : dayColumn(column)
}

/** The Khartoum weekday (0 is Sunday) and hour of a timestamp column, for the weekday x hour heatmap. */
export function weekdayHourColumns(column: PgColumn | SQL) {
  return {
    weekday: sql<number>`extract(dow from ${column} at time zone ${SQL_ZONE})::int`,
    hour: sql<number>`extract(hour from ${column} at time zone ${SQL_ZONE})::int`,
  }
}

/** The Khartoum calendar month of an instant, `"2026-11"`: the first seven letters of its day. */
export function monthOf(at: Date) {
  return dayOf(at).slice(0, 7)
}

/** The Khartoum calendar month of a timestamp column or expression, as text (`"2026-11"`). */
export function monthColumn(column: PgColumn | SQL) {
  return sql<string>`to_char(${column} at time zone ${SQL_ZONE}, 'YYYY-MM')`
}

/**
 * Matches timestamps inside the Khartoum days `first` to `last`, both included,
 * or, when the range carries them, from the Khartoum minute `from` up to (not
 * including) `to` (a custom report period, step 11.7-r1).
 */
export function withinDays(column: PgColumn | SQL, days: DayRange): SQL {
  if (days.from && days.to)
    return sql`${column} >= (${days.from}::timestamp at time zone ${SQL_ZONE}) and ${column} < (${days.to}::timestamp at time zone ${SQL_ZONE})`
  return sql`${column} >= (${days.first}::date::timestamp at time zone ${SQL_ZONE}) and ${column} < ((${days.last}::date + 1)::timestamp at time zone ${SQL_ZONE})`
}

/** Whole Khartoum days, both ends included; `from`/`to` (Khartoum minutes, `to` exclusive) narrow timestamp matches; `hourly`: buckets are hours. */
export type DayRange = {
  first: string
  last: string
  from?: string
  to?: string
  hourly?: boolean
}
