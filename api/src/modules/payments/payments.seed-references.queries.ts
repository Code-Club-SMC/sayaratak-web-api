import { inArray, or } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { payments } from "./payments.tables"

export async function findPaymentReferences(
  tx: Transaction,
  input: {
    ownerIds: string[]
    uploadIds: string[]
    itemIds: string[]
  }
) {
  const conditions = []
  if (input.ownerIds.length) {
    conditions.push(inArray(payments.userId, input.ownerIds))
    conditions.push(inArray(payments.reviewedBy, input.ownerIds))
  }
  if (input.uploadIds.length) {
    conditions.push(inArray(payments.receiptUploadId, input.uploadIds))
  }
  if (input.itemIds.length) {
    conditions.push(inArray(payments.itemId, input.itemIds))
  }
  if (!conditions.length) return []
  return tx
    .select({
      id: payments.id,
      userId: payments.userId,
      reviewedBy: payments.reviewedBy,
      receiptUploadId: payments.receiptUploadId,
      itemType: payments.itemType,
      itemId: payments.itemId,
    })
    .from(payments)
    .where(or(...conditions))
}
