import { inArray } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { subscriptions } from "./plans.tables"

export async function findSubscriptionReferences(
  tx: Transaction,
  ownerIds: string[]
) {
  if (!ownerIds.length) return []
  return tx
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
    })
    .from(subscriptions)
    .where(inArray(subscriptions.userId, ownerIds))
}
