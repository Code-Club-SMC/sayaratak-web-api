import { and, desc, eq, inArray } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import {
  type NewPaymentRow,
  type PaymentRow,
  payments,
} from "./payments.tables"

export function updateRejectedOf(
  ex: Executor,
  change: { userId: string; reason: string; at: Date }
) {
  return ex
    .update(payments)
    .set({
      status: "rejected",
      rejectionReason: change.reason,
      reviewedAt: change.at,
    })
    .where(
      and(
        eq(payments.userId, change.userId),
        eq(payments.status, "pending_review")
      )
    )
}

export function countPending(ex: Executor) {
  return ex.$count(payments, eq(payments.status, "pending_review"))
}

export function getPendingId(
  ex: Executor,
  item: { userId: string; itemType: PaymentRow["itemType"]; itemId: string }
) {
  return ex
    .select({ id: payments.id })
    .from(payments)
    .where(
      and(
        eq(payments.userId, item.userId),
        eq(payments.itemType, item.itemType),
        eq(payments.itemId, item.itemId),
        eq(payments.status, "pending_review")
      )
    )
    .then(([row]) => row?.id)
}

/** The plan the account sent a receipt for and the admin has not decided on, newest first. */
export function getPlanUnderReviewId(ex: Executor, userId: string) {
  return ex
    .select({ itemId: payments.itemId })
    .from(payments)
    .where(
      and(
        eq(payments.userId, userId),
        eq(payments.itemType, "plan"),
        eq(payments.status, "pending_review")
      )
    )
    .orderBy(desc(payments.createdAt))
    .limit(1)
    .then(([row]) => row?.itemId)
}

/** Null when the one-receipt-per-item index already holds one (two sends at once). */
export function insertIfNone(ex: Executor, row: NewPaymentRow) {
  return ex
    .insert(payments)
    .values(row)
    .onConflictDoNothing()
    .returning()
    .then(([saved]) => saved ?? null)
}

export async function listOf(
  ex: Executor,
  scope: { userId: string; offset: number; size: number }
) {
  const where = eq(payments.userId, scope.userId)
  const [rows, total] = await Promise.all([
    ex
      .select()
      .from(payments)
      .where(where)
      .orderBy(desc(payments.createdAt), desc(payments.id))
      .limit(scope.size)
      .offset(scope.offset),
    ex.$count(payments, where),
  ])
  return { rows, total }
}

/** The status of the newest receipt for each of these promotions; a promotion without one is left out. */
export function listPromotionStatuses(ex: Executor, promotionIds: string[]) {
  if (promotionIds.length === 0) return Promise.resolve([])
  return ex
    .selectDistinctOn([payments.itemId], {
      itemId: payments.itemId,
      status: payments.status,
    })
    .from(payments)
    .where(
      and(
        eq(payments.itemType, "promotion"),
        inArray(payments.itemId, promotionIds)
      )
    )
    .orderBy(payments.itemId, desc(payments.createdAt))
}
