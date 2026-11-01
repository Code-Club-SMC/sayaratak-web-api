import { db } from "~/shared/db/client"
import type { Executor, Transaction } from "~/shared/db/tx"
import { clock } from "~/shared/time/clock"
import type { SessionUser } from "~/modules/auth/auth.types"
import { uploadUrl } from "~/modules/uploads/uploads.service"

import { toPayment } from "./payments.mapper"
import * as q from "./payments.queries"

// The reason the web shows on a receipt rejected because its sender left.
const ACCOUNT_DELETED = "account_deleted"

/**
 * A deleted account's payments stay as financial records; those still under
 * review are rejected (A2 "Account deletion").
 */
export async function rejectPendingOf(tx: Transaction, userId: string) {
  await q.updateRejectedOf(tx, {
    userId,
    reason: ACCOUNT_DELETED,
    at: clock.now(),
  })
}

/** Receipts waiting in the admin payments queue. */
export function countPendingPayments(ex: Executor) {
  return q.countPending(ex)
}

/** The plan the account paid for and the admin has not decided on yet: billing shows it as "under review". */
export function getPlanUnderReviewId(ex: Executor, userId: string) {
  return q.getPlanUnderReviewId(ex, userId)
}

/** `GET /me/payments`: the account's payments, newest first. */
export async function listMyPayments(
  user: SessionUser,
  page: { page: number; pageSize: number }
) {
  const { rows, total } = await q.listOf(db, {
    userId: user.id,
    offset: (page.page - 1) * page.pageSize,
    size: page.pageSize,
  })
  const items = await Promise.all(
    rows.map(async (row) =>
      toPayment(row, (await uploadUrl(db, row.receiptUploadId)) ?? "")
    )
  )
  return { items, total, page: page.page, pageSize: page.pageSize }
}

/** The status of the newest receipt for each promotion (a promotion with none is not in the map). */
export async function getPromotionPaymentStatuses(
  ex: Executor,
  promotionIds: string[]
) {
  const rows = await q.listPromotionStatuses(ex, promotionIds)
  return new Map(rows.map((row) => [row.itemId, row.status]))
}
