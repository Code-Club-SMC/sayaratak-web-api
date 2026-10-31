import { notificationSchema } from "@sayaratak/shared/schemas/messaging"
import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { role, user } from "~/modules/auth/auth.tables"
import { cities } from "~/modules/taxonomy/taxonomy.tables"
import { bilingual, bilingualText, createdAt } from "~/shared/db/columns"

export const notificationType = pgEnum(
  "notification_type",
  notificationSchema.shape.type.enum
)

export const notifications = pgTable(
  "notifications",
  {
    id: text().primaryKey(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationType().notNull(),
    title: bilingualText(),
    body: bilingualText(),
    href: text(),
    createdAt: createdAt(),
    readAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    // The bell's unread count and the newest-first list.
    index().on(table.userId, table.readAt, table.createdAt),
    check("notifications_title", bilingual(table.title)),
    check("notifications_body", bilingual(table.body)),
  ]
)

// An admin message sent once to every account matching the audience; `recipients` is the count it reached.
export const broadcasts = pgTable(
  "broadcasts",
  {
    id: text().primaryKey(),
    title: bilingualText(),
    body: bilingualText(),
    href: text(),
    roles: role().array().notNull(),
    cityId: text().references(() => cities.id, { onDelete: "set null" }),
    verifiedOnly: boolean().notNull(),
    recipients: integer().notNull(),
    sentBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (table) => [
    index().on(table.createdAt),
    check("broadcasts_title", bilingual(table.title)),
    check("broadcasts_body", bilingual(table.body)),
    check("broadcasts_roles", sql`cardinality(${table.roles}) > 0`),
    check("broadcasts_recipients", sql`${table.recipients} >= 0`),
  ]
)
