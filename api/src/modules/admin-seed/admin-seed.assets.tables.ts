import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core"

import { createdAt } from "~/shared/db/columns"

import { seedDatasets, seedOperations } from "./admin-seed.tables"

export const seedAssetState = pgEnum("seed_asset_state", [
  "expected",
  "validated",
  "stored",
  "rejected",
])
export const seedRecordDomain = pgEnum("seed_record_domain", [
  "owner",
  "listing",
  "dealership",
  "workshop",
  "mechanic",
  "upload",
])
export const seedStorageState = pgEnum("seed_storage_state", [
  "pending",
  "stored",
  "delete-pending",
  "deleted",
])

export const seedAssets = pgTable(
  "seed_assets",
  {
    datasetId: text()
      .notNull()
      .references(() => seedDatasets.id, { onDelete: "restrict" }),
    assetId: text().notNull(),
    generation: integer().default(1).notNull(),
    filename: text().notNull(),
    operationId: text().references(() => seedOperations.id, {
      onDelete: "restrict",
    }),
    state: seedAssetState().default("expected").notNull(),
    accepted: boolean().default(false).notNull(),
    inputDigest: text(),
    bytes: integer(),
    width: integer(),
    height: integer(),
    mime: text(),
    uploadId: text(),
    providerId: text(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.datasetId, table.assetId, table.generation] }),
    uniqueIndex("seed_one_accepted_asset")
      .on(table.datasetId, table.assetId)
      .where(sql`${table.accepted}`),
    check("seed_asset_generation", sql`${table.generation} >= 1`),
    check(
      "seed_asset_digest",
      sql`${table.inputDigest} is null or ${table.inputDigest} ~ '^[a-f0-9]{64}$'`
    ),
    check("seed_asset_bytes", sql`${table.bytes} between 1 and 2097152`),
    check(
      "seed_asset_dimensions",
      sql`${table.width} between 1200 and 4096 and ${table.height} between 900 and 3072 and ${table.width} * 3 = ${table.height} * 4`
    ),
    check(
      "seed_asset_mime",
      sql`${table.mime} in ('image/jpeg', 'image/png', 'image/webp')`
    ),
    check(
      "seed_asset_accepted",
      sql`not ${table.accepted} or (${table.state} = 'stored' and ${table.uploadId} is not null and ${table.providerId} is not null and ${table.inputDigest} is not null and ${table.bytes} is not null and ${table.width} is not null and ${table.height} is not null and ${table.mime} is not null)`
    ),
  ]
)

// IDs survive physical removal; these are ownership tombstones, not cascading foreign keys.
export const seedRecords = pgTable(
  "seed_records",
  {
    datasetId: text()
      .notNull()
      .references(() => seedDatasets.id, { onDelete: "restrict" }),
    domain: seedRecordDomain().notNull(),
    recordId: text().notNull(),
    recordDigest: text().notNull(),
    outcome: text().default("owned").notNull(),
    retentionReason: text(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.datasetId, table.domain, table.recordId] }),
    check("seed_record_digest", sql`${table.recordDigest} ~ '^[a-f0-9]{64}$'`),
    check(
      "seed_record_outcome",
      sql`${table.outcome} in ('owned', 'removed', 'retained')`
    ),
  ]
)

export const seedStorageIntents = pgTable(
  "seed_storage_intents",
  {
    id: text().primaryKey(),
    datasetId: text()
      .notNull()
      .references(() => seedDatasets.id, { onDelete: "restrict" }),
    operationId: text().references(() => seedOperations.id, {
      onDelete: "restrict",
    }),
    assetId: text(),
    generation: integer(),
    provider: text().notNull(),
    objectKey: text().notNull(),
    digest: text().notNull(),
    purpose: text().notNull(),
    state: seedStorageState().default("pending").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex().on(table.provider, table.objectKey),
    index().on(table.datasetId, table.state),
    check("seed_storage_digest", sql`${table.digest} ~ '^[a-f0-9]{64}$'`),
    check(
      "seed_storage_provider",
      sql`${table.provider} in ('r2', 'cloudinary')`
    ),
    check(
      "seed_storage_purpose",
      sql`${table.purpose} in ('archive', 'image')`
    ),
    check(
      "seed_storage_generation",
      sql`${table.generation} is null or ${table.generation} >= 1`
    ),
  ]
)
