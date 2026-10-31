import { eventTypeSchema } from "@sayaratak/shared/schemas/api"
import { sql } from "drizzle-orm"
import {
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
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
    check("events_count_positive", sql`${table.count} > 0`),
  ]
)
