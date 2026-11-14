import {
  seedDatasetSummarySchema,
  seedOperationSchema,
  type SeedDatasetSummary,
  type SeedOperation,
} from "@sayaratak/shared/schemas/admin-seed"

import type { SeedDatasetRow, SeedOperationRow } from "./admin-seed.tables"

export function toSeedDataset(row: SeedDatasetRow): SeedDatasetSummary {
  return seedDatasetSummarySchema.parse({
    id: row.id,
    version: row.version,
    manifestDigest: row.manifestDigest,
    state: row.state,
    createdAt: row.createdAt.toISOString(),
  })
}

export function toSeedOperation(row: SeedOperationRow): SeedOperation {
  return seedOperationSchema.parse({
    id: row.id,
    kind: row.kind,
    state: row.state,
    progress: {
      stage: row.stage,
      completed: row.completed,
      total: row.total,
      percent: progressPercent(row),
    },
    committedImages: row.committedImages,
    committedBusinesses: row.committedBusinesses,
    committedListings: row.committedListings,
    retainedRecords: row.retainedRecords,
    error: row.errorCode,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  })
}

function progressPercent(row: SeedOperationRow) {
  if (row.state === "completed") return 100
  if (row.total === 0) return null
  // Example: 230/230 committed units still show 99 until the completion transaction succeeds.
  return Math.min(99, Math.floor((row.completed / row.total) * 100))
}
