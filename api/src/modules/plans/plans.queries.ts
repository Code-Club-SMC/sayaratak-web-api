import type { Plan } from "@sayaratak/shared/schemas/billing"
import { and, asc, eq, gt } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { type NewSubscriptionRow, plans, subscriptions } from "./plans.tables"

export function getActiveSubscription(ex: Executor, userId: string) {
  return ex
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"))
    )
    .then(([row]) => row)
}

/** The plan behind the account's active subscription, if any. */
export function getActivePlan(ex: Executor, userId: string) {
  return ex
    .select({ plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"))
    )
    .then(([row]) => row?.plan)
}

/** The audience's free plan: its first plan, by list order, priced 0. */
export function getFreePlan(ex: Executor, audience: Plan["audience"]) {
  return ex
    .select()
    .from(plans)
    .where(and(eq(plans.audience, audience), eq(plans.price, 0)))
    .orderBy(asc(plans.sortOrder))
    .limit(1)
    .then(([row]) => row)
}

export function getPlan(ex: Executor, id: string) {
  return ex
    .select()
    .from(plans)
    .where(eq(plans.id, id))
    .then(([row]) => row)
}

/** Owners whose active subscription is to a plan that costs money. */
export function listPaidOwnerIds(ex: Executor) {
  return ex
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(eq(subscriptions.status, "active"), gt(plans.price, 0)))
    .then((rows) => rows.map((row) => row.userId))
}

export function updateActiveCanceled(ex: Executor, userId: string) {
  return ex
    .update(subscriptions)
    .set({ status: "canceled" })
    .where(
      and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active"))
    )
}

export function insertSubscription(ex: Executor, row: NewSubscriptionRow) {
  return ex.insert(subscriptions).values(row)
}
