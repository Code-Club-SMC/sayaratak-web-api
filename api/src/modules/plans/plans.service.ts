import type { Plan } from "@sayaratak/shared/schemas/billing"

import type { Executor } from "~/shared/db/tx"
import { newId } from "~/shared/text/ids"
import { clock } from "~/shared/time/clock"
import { listIdsOf } from "~/modules/listings/listings.stats.service"
import * as promotions from "~/modules/promotions/promotions.service"

import * as q from "./plans.queries"

const DAY_MS = 86_400_000
const SUBSCRIPTION_ID_PREFIX = "sub"

/**
 * The account's active subscription, if any. A10: an ended free plan stays
 * `active` until the subscription job renews it, so a dealership is never
 * left at 0 listings for the hour in between.
 */
export function getActiveSubscription(ex: Executor, userId: string) {
  return q.getActiveSubscription(ex, userId)
}

/** The plan of the account's active subscription: where its caps come from (photos, services, portfolio). */
export function getActivePlan(ex: Executor, userId: string) {
  return q.getActivePlan(ex, userId)
}

/** Owners on a paid plan: Plus promises mechanics "Top of search". */
export async function listPaidOwnerIds(ex: Executor) {
  return new Set(await q.listPaidOwnerIds(ex))
}

/**
 * Starts the audience's free plan without payment (handoff "Plans, limits and
 * credits"), after ending any subscription the account still has. Price and
 * listing limit are copied from the plan. An audience with no free plan starts nothing.
 */
export async function startFreeSubscription(
  ex: Executor,
  account: { userId: string; audience: Plan["audience"] }
) {
  const plan = await q.getFreePlan(ex, account.audience)
  if (!plan) return
  const now = clock.now()
  await q.updateActiveCanceled(ex, account.userId)
  await q.insertSubscription(ex, {
    id: newId(SUBSCRIPTION_ID_PREFIX),
    userId: account.userId,
    planId: plan.id,
    status: "active",
    startsAt: now,
    endsAt: new Date(now.getTime() + plan.durationDays * DAY_MS),
    price: plan.price,
    listingLimit: plan.listingLimit,
  })
}

/**
 * The id of a plan an account may pick in onboarding and pay for later:
 * enabled, priced above 0, for its own audience. Anything else is undefined.
 */
export async function getPickablePaidPlanId(
  ex: Executor,
  pick: { planId: string; audience: Plan["audience"] }
) {
  const plan = await q.getPlan(ex, pick.planId)
  const ok = plan?.enabled && plan.price > 0 && plan.audience === pick.audience
  return ok ? plan.id : undefined
}

/** One plan by id, or undefined. */
export function getPlan(ex: Executor, id: string) {
  return q.getPlan(ex, id)
}

/**
 * The Featured credits of an active subscription: its plan's count, less the
 * credit promotions of the owner's listings started since the period began.
 * Nothing without an active subscription or credits.
 */
export async function getCredits(
  ex: Executor,
  of: {
    userId: string
    sub?: { status: string; startsAt: Date }
    total?: number
  }
) {
  const { sub, total = 0 } = of
  if (sub?.status !== "active" || total === 0) return { total: 0, left: 0 }
  const used = await promotions.countCreditsUsed(ex, {
    listingIds: await listIdsOf(ex, of.userId),
    since: sub.startsAt,
  })
  return { total, left: Math.max(0, total - used) }
}

/** The account's Featured credits now (`GET /me/subscription` shows the same). */
export async function getCreditsOf(ex: Executor, userId: string) {
  const sub = await q.getActiveSubscription(ex, userId)
  const plan = sub && (await q.getPlan(ex, sub.planId))
  return getCredits(ex, { userId, sub, total: plan?.featuredCredits })
}

/** Accounts on an active plan, the free one included. */
export function countActiveSubscriptions(ex: Executor) {
  return q.countActive(ex)
}
