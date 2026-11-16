import { inArray } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { reviews } from "./reviews.tables"

export async function findTargetReviews(
  tx: Transaction,
  businessIds: string[]
) {
  if (!businessIds.length) return []
  return tx
    .select({
      id: reviews.id,
      targetId: reviews.targetId,
      targetType: reviews.targetType,
    })
    .from(reviews)
    .where(inArray(reviews.targetId, businessIds))
}

export async function findAuthorReviews(tx: Transaction, ownerIds: string[]) {
  if (!ownerIds.length) return []
  return tx
    .select({
      id: reviews.id,
      authorId: reviews.authorId,
    })
    .from(reviews)
    .where(inArray(reviews.authorId, ownerIds))
}
