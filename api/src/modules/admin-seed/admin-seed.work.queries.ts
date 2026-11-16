import { and, eq, inArray, isNotNull, or } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { seedDatasets, seedOperations } from "./admin-seed.tables"
import { seedStorageIntents } from "./admin-seed.assets.tables"

const ARCHIVE_CLEANUP_PASS_SIZE = 5

export async function getWorkOperation(ex: Executor, id: string) {
  const [row] = await ex
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, id))
  return row
}

export async function lockWorkDataset(ex: Executor, id: string) {
  // Dataset first, then operation, is the shared seed mutation lock order.
  const [row] = await ex
    .select()
    .from(seedDatasets)
    .where(eq(seedDatasets.id, id))
    .for("update")
  return row
}

export async function lockWorkOperation(ex: Executor, id: string) {
  // Serialize checkpoint commits after the caller holds the dataset lock.
  const [row] = await ex
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, id))
    .for("update")
  return row
}

export async function getQueuedWork(ex: Executor) {
  const [row] = await ex
    .select()
    .from(seedOperations)
    .where(
      and(
        eq(seedOperations.activeSlot, true),
        inArray(seedOperations.state, ["queued", "running"])
      )
    )
    .limit(1)
  return row
}

export function updateWork(
  ex: Executor,
  input: { id: string; values: Partial<typeof seedOperations.$inferInsert> }
) {
  return ex
    .update(seedOperations)
    .set(input.values)
    .where(eq(seedOperations.id, input.id))
}

export function updateDatasetReady(
  ex: Executor,
  input: { id: string; at: Date }
) {
  return ex
    .update(seedDatasets)
    .set({ state: "ready", updatedAt: input.at })
    .where(eq(seedDatasets.id, input.id))
}

export function listArchiveCleanupOperations(ex: Executor) {
  return ex
    .selectDistinct({ id: seedOperations.id })
    .from(seedOperations)
    .innerJoin(
      seedStorageIntents,
      eq(seedStorageIntents.operationId, seedOperations.id)
    )
    .where(
      and(
        eq(seedStorageIntents.provider, "r2"),
        inArray(seedStorageIntents.state, [
          "pending",
          "stored",
          "delete-pending",
        ]),
        or(
          eq(seedOperations.state, "completed"),
          isNotNull(seedOperations.supersededBy),
          and(
            eq(seedOperations.state, "failed"),
            eq(seedOperations.stage, "upload"),
            eq(seedStorageIntents.state, "delete-pending")
          )
        )
      )
    )
    .limit(ARCHIVE_CLEANUP_PASS_SIZE)
}
