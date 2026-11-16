import { and, eq, inArray } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { seedStorageIntents } from "./admin-seed.assets.tables"
import { seedOperations } from "./admin-seed.tables"

const ARCHIVE_CLEANUP_PASS_SIZE = 5

export function listFailedArchiveCleanup(ex: Executor) {
  return ex
    .selectDistinct({ id: seedOperations.id })
    .from(seedOperations)
    .innerJoin(
      seedStorageIntents,
      eq(seedStorageIntents.operationId, seedOperations.id)
    )
    .where(
      and(
        eq(seedOperations.kind, "archive"),
        eq(seedOperations.state, "failed"),
        eq(seedOperations.stage, "upload"),
        eq(seedStorageIntents.provider, "r2"),
        eq(seedStorageIntents.purpose, "archive"),
        inArray(seedStorageIntents.state, [
          "pending",
          "stored",
          "delete-pending",
        ])
      )
    )
    .limit(ARCHIVE_CLEANUP_PASS_SIZE)
}

export function insertStorageIntent(
  ex: Executor,
  row: typeof seedStorageIntents.$inferInsert
) {
  return ex.insert(seedStorageIntents).values(row).onConflictDoNothing()
}

export function listOperationStorageIntents(ex: Executor, operationId: string) {
  return ex
    .select()
    .from(seedStorageIntents)
    .where(eq(seedStorageIntents.operationId, operationId))
}

export function updateStorageIntent(
  ex: Executor,
  input: {
    operationId: string
    objectKey: string
    state: typeof seedStorageIntents.$inferSelect.state
  }
) {
  return ex
    .update(seedStorageIntents)
    .set({ state: input.state })
    .where(
      and(
        eq(seedStorageIntents.operationId, input.operationId),
        eq(seedStorageIntents.objectKey, input.objectKey)
      )
    )
}
