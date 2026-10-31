import { notificationSchema } from "@sayaratak/shared/schemas/messaging"
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { user } from "~/modules/auth/auth.tables"
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
