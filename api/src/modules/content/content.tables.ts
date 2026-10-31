import type { Settings } from "@sayaratak/shared/schemas/admin"
import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { jsonb } from "~/shared/db/jsonb"

export const backupSchedule = pgEnum("backup_schedule", [
  "daily",
  "weekly",
  "off",
])

// The site settings live in one row with id 1; the id check keeps it one.
export const settings = pgTable(
  "settings",
  {
    id: integer().primaryKey().default(1),
    autoApproveVerifiedDealers: boolean().notNull(),
    listingExpiryDays: integer().notNull(),
    individualSubscriptionsEnabled: boolean().notNull(),
    freeListingLimit: integer().notNull(),
    bankakName: text().notNull(),
    bankakNumber: text().notNull(),
    contact: jsonb().$type<Settings["contact"]>().notNull(),
    locales: text().array().$type<Settings["locales"]>().notNull(),
    backupSchedule: backupSchedule().notNull(),
    lastAutoBackupAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    check("settings_single_row", sql`${table.id} = 1`),
    check("settings_locales_known", sql`${table.locales} <@ array['ar', 'en']`),
    check("settings_expiry_positive", sql`${table.listingExpiryDays} > 0`),
    check(
      "settings_free_limit_not_negative",
      sql`${table.freeListingLimit} >= 0`
    ),
  ]
)

export type SettingsRow = typeof settings.$inferSelect
export type NewSettingsRow = typeof settings.$inferInsert
