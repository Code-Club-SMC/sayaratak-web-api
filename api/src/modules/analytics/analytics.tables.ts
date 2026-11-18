import { eventTypeSchema } from "@sayaratak/shared/schemas/api"
import { sql } from "drizzle-orm"
import {
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
} from "drizzle-orm/pg-core"

export const eventType = pgEnum("event_type", eventTypeSchema.enum)

// One counter per Khartoum day, target and type, raised by an upsert `count = count + 1`.
// The target is a listing, business or banner id, so it carries no foreign key (A5).
export const events = pgTable(
  "events",
  {
    day: date({ mode: "string" }).notNull(),
    targetId: text().notNull(),
    type: eventType().notNull(),
    count: integer().notNull(),
  },
  (table) => [
    // Target first: analytics read one target over a range of days, so the key serves them.
    primaryKey({ columns: [table.targetId, table.day, table.type] }),
    // The monthly roll-up finds the oldest days.
    index().on(table.day),
    check("events_count_positive", sql`${table.count} > 0`),
  ]
)

// Owner, step 11.7-r2: the same counters per Khartoum hour (0 to 23), kept 90 days and then
// deleted (the daily rows already hold them). Written next to the daily row by the same event.
export const eventsHourly = pgTable(
  "events_hourly",
  {
    day: date({ mode: "string" }).notNull(),
    hour: smallint().notNull(),
    targetId: text().notNull(),
    type: eventType().notNull(),
    count: integer().notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.targetId, table.day, table.hour, table.type],
    }),
    // The 90-day prune and the "hourly data starts" read find the oldest days.
    index().on(table.day),
    check("events_hourly_count_positive", sql`${table.count} > 0`),
    check("events_hourly_hour_range", sql`${table.hour} between 0 and 23`),
  ]
)

// Owner, 9.3 (O3): a day's counters older than 13 months are added into one row per month and
// the daily rows deleted. `month` is the first day of the Khartoum month. Nothing reads it yet;
// it keeps the history a future yearly report would need.
export const eventsMonthly = pgTable(
  "events_monthly",
  {
    month: date({ mode: "string" }).notNull(),
    targetId: text().notNull(),
    type: eventType().notNull(),
    count: integer().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.targetId, table.month, table.type] }),
    check("events_monthly_count_positive", sql`${table.count} > 0`),
  ]
)
