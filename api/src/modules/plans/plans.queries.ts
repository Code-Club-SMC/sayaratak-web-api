import { and, eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { subscriptions } from "./plans.tables"

export function getActiveSubscription(ex: Executor, userId: string) {
  return ex
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"))
    )
    .then(([row]) => row)
}
