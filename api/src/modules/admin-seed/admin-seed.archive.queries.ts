import { and, eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { seedAssets } from "./admin-seed.assets.tables"
import { seedDatasets, seedOperations } from "./admin-seed.tables"

export async function lockArchiveDataset(ex: Executor) {
  // Dataset first, then operation: intake shares the install/removal lock order.
  const [row] = await ex
    .select()
    .from(seedDatasets)
    .where(eq(seedDatasets.liveSlot, true))
    .for("update")
  return row
}

export async function getArchiveOperation(ex: Executor, id: string) {
  const [row] = await ex
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, id))
    .limit(1)
  return row
}

export async function lockArchiveOperation(ex: Executor, id: string) {
  // Prevent intake finalization and a receiving-timeout transition from racing.
  const [row] = await ex
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, id))
    .for("update")
  return row
}

export function listArchiveOperations(ex: Executor, datasetId: string) {
  return ex
    .select()
    .from(seedOperations)
    .where(
      and(
        eq(seedOperations.datasetId, datasetId),
        eq(seedOperations.kind, "archive")
      )
    )
}

export async function insertArchiveOperation(
  ex: Executor,
  row: typeof seedOperations.$inferInsert
) {
  const [inserted] = await ex.insert(seedOperations).values(row).returning()
  return inserted
}

export async function updateArchiveOperation(
  ex: Executor,
  input: {
    id: string
    changes: Partial<typeof seedOperations.$inferInsert>
  }
) {
  const [row] = await ex
    .update(seedOperations)
    .set(input.changes)
    .where(eq(seedOperations.id, input.id))
    .returning()
  return row
}

export function listArchiveAssets(ex: Executor, datasetId: string) {
  return ex.select().from(seedAssets).where(eq(seedAssets.datasetId, datasetId))
}

export function insertRejectedArchiveAsset(
  ex: Executor,
  row: typeof seedAssets.$inferInsert
) {
  return ex.insert(seedAssets).values(row).onConflictDoNothing()
}
