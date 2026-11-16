import { and, inArray, notInArray } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { favorites } from "./favorites.tables"

export async function findFavoriteSeedReferences(
  tx: Transaction,
  input: { listingIds: string[]; ownerIds: string[] }
) {
  if (!input.listingIds.length) return []
  const conditions = [inArray(favorites.listingId, input.listingIds)]
  if (input.ownerIds.length) {
    conditions.push(notInArray(favorites.userId, input.ownerIds))
  }
  return tx
    .select({
      listingId: favorites.listingId,
      userId: favorites.userId,
    })
    .from(favorites)
    .where(and(...conditions))
}
