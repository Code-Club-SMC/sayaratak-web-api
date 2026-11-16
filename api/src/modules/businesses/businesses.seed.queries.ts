import { and, eq, isNotNull } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import {
  dealerships,
  mechanics,
  portfolioItems,
  workshops,
} from "./businesses.tables"

const TABLES = [dealerships, workshops, mechanics]

export async function lockSeedBusiness(ex: Executor, id: string) {
  for (const table of TABLES) {
    // Domain row lock serializes new dependencies with hiding and removal.
    const [row] = await ex
      .select({
        id: table.id,
        seedDatasetId: table.seedDatasetId,
        seedHidden: table.seedHidden,
      })
      .from(table)
      .where(eq(table.id, id))
      .for("update")
    if (row) return row
  }
}

export async function hasPublicSeedContent(ex: Executor) {
  for (const table of TABLES) {
    const [row] = await ex
      .select({ id: table.id })
      .from(table)
      .where(and(isNotNull(table.seedDatasetId), eq(table.seedHidden, false)))
      .limit(1)
    if (row) return true
  }
  return false
}

export function insertSeedPortfolio(
  ex: Executor,
  row: typeof portfolioItems.$inferInsert
) {
  return ex.insert(portfolioItems).values(row)
}
