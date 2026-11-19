import { and, eq, gte } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { payments } from "./payments.tables"

/** The account's receipts sent since `since`, for the Spending report. */
export function listSentSince(
  ex: Executor,
  find: { userId: string; since: Date }
) {
  return ex
    .select({
      id: payments.id,
      itemType: payments.itemType,
      itemLabel: payments.itemLabel,
      amount: payments.amount,
      status: payments.status,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(
      and(eq(payments.userId, find.userId), gte(payments.createdAt, find.since))
    )
}
