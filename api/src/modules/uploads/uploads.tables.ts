import { sql } from "drizzle-orm"
import {
  type AnyPgColumn,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

import { user } from "~/modules/auth/auth.tables"
import { createdAt } from "~/shared/db/columns"

export const uploadKind = pgEnum("upload_kind", [
  "image",
  "video",
  "receipt",
  "document",
])
export const uploadDelivery = pgEnum("upload_delivery", ["public", "private"])

// A file on Cloudinary (`cloudinaryId`) or, for demo data only, a file web serves from
// `public/mock` (`url`, may hold `{w}`); exactly one is set. Unattached rows are deleted
// by the cleanup job (A10), so every table that points here sets `attachedAt`.
export const uploads = pgTable(
  "uploads",
  {
    id: text().primaryKey(),
    // Null for an upload made before sign-in (A18 `sy_upload` token) and after the owner is deleted.
    ownerUserId: text().references(() => user.id, { onDelete: "set null" }),
    kind: uploadKind().notNull(),
    cloudinaryId: text(),
    url: text(),
    delivery: uploadDelivery().notNull(),
    width: integer(),
    height: integer(),
    placeholderColor: text(),
    // Demo files carry no size or type.
    bytes: integer(),
    mime: text(),
    // A video's first-frame image.
    posterId: text().references((): AnyPgColumn => uploads.id, {
      onDelete: "set null",
    }),
    attachedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index().on(table.ownerUserId),
    index().on(table.createdAt).where(sql`${table.attachedAt} is null`),
    check(
      "uploads_one_source",
      sql`(${table.cloudinaryId} is null) <> (${table.url} is null)`
    ),
    check(
      "uploads_private_kinds",
      sql`(${table.delivery} = 'private') = (${table.kind} in ('receipt', 'document'))`
    ),
  ]
)

export type UploadRow = typeof uploads.$inferSelect
