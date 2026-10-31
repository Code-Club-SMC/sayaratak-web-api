import { and, eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { payments } from "./payments.tables"

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
