import { eq, inArray } from "drizzle-orm"

import type { Executor, Transaction } from "~/shared/db/tx"

import { type NewPromotionRow, promotions } from "./promotions.tables"

/** The promotion, held until the transaction ends, so two decisions on its receipt queue up. */
export function lockPromotion(tx: Transaction, id: string) {
  return tx
    .select()
    .from(promotions)
    .where(eq(promotions.id, id))
    .for("update")
    .then(([row]) => row)
}

/** The promotions with these ids: what a payment row names. */
export function listByIds(ex: Executor, ids: string[]) {
  if (ids.length === 0) return Promise.resolve([])
  return ex
    .select({
      id: promotions.id,
      listingId: promotions.listingId,
      type: promotions.type,
      durationDays: promotions.durationDays,
    })
    .from(promotions)
    .where(inArray(promotions.id, ids))
}

export function updateStarted(
  tx: Transaction,
  change: { id: string; set: Partial<NewPromotionRow> }
) {
  return tx
    .update(promotions)
    .set(change.set)
    .where(eq(promotions.id, change.id))
}
