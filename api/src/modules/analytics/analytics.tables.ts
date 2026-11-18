import { eventTypeSchema } from "@sayaratak/shared/schemas/api"
import { sql } from "drizzle-orm"
import {
  bigint,
  boolean,
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

// Owner, step 11.7-r4: page-1 public searches per Khartoum day and filter set, with no user id
// and never the typed text (`hasText` only). An absent filter is "" so the key has no nulls.
// Kept 13 months like the daily events, then deleted by `prune`.
export const searchesDaily = pgTable(
  "searches_daily",
  {
    day: date({ mode: "string" }).notNull(),
    kind: text().notNull(),
    intent: text().notNull(),
    type: text().notNull(),
    make: text().notNull(),
    model: text().notNull(),
    city: text().notNull(),
    partCategory: text().notNull(),
    hasText: boolean().notNull(),
    searches: integer().notNull(),
    zeroResults: integer().notNull(),
    results: bigint({ mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({
      name: "searches_daily_pk",
      columns: [
        table.day,
        table.kind,
        table.intent,
        table.type,
        table.make,
        table.model,
        table.city,
        table.partCategory,
        table.hasText,
      ],
    }),
    check("searches_daily_searches_positive", sql`${table.searches} > 0`),
  ]
)
