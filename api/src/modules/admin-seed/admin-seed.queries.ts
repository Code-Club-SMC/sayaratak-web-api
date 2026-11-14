import { desc, eq, sql } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { seedDatasets } from "./admin-seed.tables"

/** Serializes preparation even when the first dataset row does not exist yet. */
export async function lockPreparation(ex: Executor) {
  // A transaction-scoped lock is released on rollback, commit or connection loss.
  await ex.execute(
    sql`select pg_advisory_xact_lock(hashtext('sayaratak:seed:prepare'))`
  )
}

export async function getLiveDataset(ex: Executor) {
  const [row] = await ex
    .select()
    .from(seedDatasets)
    .where(eq(seedDatasets.liveSlot, true))
    .limit(1)
  return row
}

export async function getLatestDataset(ex: Executor) {
  const [row] = await ex
    .select()
    .from(seedDatasets)
    .orderBy(desc(seedDatasets.createdAt), desc(seedDatasets.id))
    .limit(1)
  return row
}

export async function insertDataset(
  ex: Executor,
  row: typeof seedDatasets.$inferInsert
) {
  const [inserted] = await ex.insert(seedDatasets).values(row).returning()
  return inserted
}
