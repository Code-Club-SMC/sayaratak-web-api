import { inArray } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { promotions } from "./promotions.tables"

export async function findPromotionReferences(
  tx: Transaction,
  listingIds: string[]
) {
  if (!listingIds.length) return []
  return tx
    .select({
      id: promotions.id,
      listingId: promotions.listingId,
    })
    .from(promotions)
    .where(inArray(promotions.listingId, listingIds))
}
