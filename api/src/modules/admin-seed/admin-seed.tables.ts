import {
  seedDatasetStateSchema,
  seedOperationKindSchema,
  seedOperationStateSchema,
  seedStageSchema,
} from "@sayaratak/shared/schemas/admin-seed"
import type { SeedManifest } from "@sayaratak/shared/schemas/seed-manifest"
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
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { createdAt } from "~/shared/db/columns"
import { jsonb } from "~/shared/db/jsonb"
import { user } from "~/modules/auth/auth.tables"

export const seedDatasetState = pgEnum(
  "seed_dataset_state",
  seedDatasetStateSchema.enum
)
export const seedOperationKind = pgEnum(
  "seed_operation_kind",
  seedOperationKindSchema.enum
)
export const seedOperationState = pgEnum(
  "seed_operation_state",
  seedOperationStateSchema.enum
)
export const seedStage = pgEnum("seed_stage", seedStageSchema.enum)

export const seedDatasets = pgTable(
  "seed_datasets",
  {
    id: text().primaryKey(),
    version: text().notNull(),
    manifestDigest: text().notNull(),
    manifest: jsonb().$type<SeedManifest>().notNull(),
    state: seedDatasetState().default("preparing").notNull(),
    liveSlot: boolean().default(true),
    createdBy: text().references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("seed_one_live_dataset")
      .on(table.liveSlot)
      .where(sql`${table.liveSlot} is true`),
    check(
      "seed_dataset_slot",
      sql`${table.liveSlot} is null or ${table.liveSlot} is true`
    ),
    check(
      "seed_dataset_removed_slot",
      sql`(${table.state} = 'removed') = (${table.liveSlot} is null)`
    ),
    check(
      "seed_dataset_digest",
      sql`${table.manifestDigest} ~ '^[a-f0-9]{64}$'`
    ),
  ]
)

export const seedOperations = pgTable(
  "seed_operations",
  {
    id: text().primaryKey(),
    datasetId: text()
      .notNull()
      .references(() => seedDatasets.id, { onDelete: "restrict" }),
    kind: seedOperationKind().notNull(),
    state: seedOperationState().notNull(),
    stage: seedStage().notNull(),
    activeSlot: boolean().default(true),
    supersededBy: text(),
    actorId: text().references(() => user.id, { onDelete: "set null" }),
    actorIp: text().notNull(),
    completed: integer().default(0).notNull(),
    total: integer().notNull(),
    committedImages: integer().default(0).notNull(),
    committedBusinesses: integer().default(0).notNull(),
    committedListings: integer().default(0).notNull(),
    retainedRecords: integer().default(0).notNull(),
    checkpoint: jsonb().$type<Record<string, unknown>>().default({}).notNull(),
    errorCode: text(),
    createdAt: createdAt(),
    updatedAt: timestamp({ withTimezone: true }).notNull(),
  },
  (table) => [
    index().on(table.datasetId, table.createdAt),
    uniqueIndex("seed_one_active_operation")
      .on(table.activeSlot)
      .where(sql`${table.activeSlot} is true`),
    check(
      "seed_operation_slot",
      sql`${table.activeSlot} is null or ${table.activeSlot} is true`
    ),
    check(
      "seed_operation_terminal_slot",
      sql`(${table.activeSlot} is null) = (${table.state} = 'completed' or ${table.supersededBy} is not null)`
    ),
    check(
      "seed_operation_superseded",
      sql`${table.supersededBy} is null or (${table.state} = 'failed' and ${table.supersededBy} <> ${table.id})`
    ),
    check(
      "seed_operation_receiving",
      sql`${table.state} <> 'receiving' or ${table.kind} = 'archive'`
    ),
    check(
      "seed_operation_progress",
      sql`${table.completed} >= 0 and ${table.total} >= ${table.completed}`
    ),
    check(
      "seed_operation_completed",
      sql`${table.state} <> 'completed' or (${table.completed} = ${table.total} and ${table.stage} = 'complete')`
    ),
    check(
      "seed_operation_counts",
      sql`${table.committedImages} between 0 and 460 and ${table.committedBusinesses} between 0 and 30 and ${table.committedListings} between 0 and 200 and ${table.retainedRecords} between 0 and 230`
    ),
    check(
      "seed_operation_error",
      sql`${table.errorCode} is null or ${table.errorCode} ~ '^[a-z0-9_]+$'`
    ),
  ]
)

export type SeedDatasetRow = typeof seedDatasets.$inferSelect
export type SeedOperationRow = typeof seedOperations.$inferSelect
