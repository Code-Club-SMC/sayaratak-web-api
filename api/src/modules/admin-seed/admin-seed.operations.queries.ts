import { and, desc, eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { seedOperations } from "./admin-seed.tables"

export type { SeedDatasetRow, SeedOperationRow } from "./admin-seed.tables"

export async function getActiveOperation(ex: Executor, datasetId: string) {
  const [row] = await ex
    .select()
    .from(seedOperations)
    .where(
      and(
        eq(seedOperations.datasetId, datasetId),
        eq(seedOperations.activeSlot, true)
      )
    )
    .limit(1)
  return row
}

export async function getLatestOperation(ex: Executor, datasetId: string) {
  const [row] = await ex
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.datasetId, datasetId))
    .orderBy(desc(seedOperations.createdAt), desc(seedOperations.id))
    .limit(1)
  return row
}
