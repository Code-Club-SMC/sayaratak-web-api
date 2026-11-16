import { inArray } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { savedSearches } from "./saved-searches.tables"

export async function findSavedSearchUserReferences(
  tx: Transaction,
  ownerIds: string[]
) {
  if (!ownerIds.length) return []
  return tx
    .select({
      id: savedSearches.id,
      userId: savedSearches.userId,
    })
    .from(savedSearches)
    .where(inArray(savedSearches.userId, ownerIds))
}
