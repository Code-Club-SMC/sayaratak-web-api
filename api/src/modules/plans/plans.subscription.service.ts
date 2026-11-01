import { planSchema } from "@sayaratak/shared/schemas/billing"

import { db } from "~/shared/db/client"
import type { Executor } from "~/shared/db/tx"
import * as auth from "~/modules/auth/auth.service"
import type { SessionUser } from "~/modules/auth/auth.types"
import * as content from "~/modules/content/content.service"
import { getListingUsage } from "~/modules/listings/listings.rules.service"
import { listIdsOf } from "~/modules/listings/listings.stats.service"
import * as payments from "~/modules/payments/payments.service"
import * as promotions from "~/modules/promotions/promotions.service"

import { toPlan, toSubscription } from "./plans.mapper"
import * as q from "./plans.queries"

const AUDIENCES = planSchema.shape.audience.options

/**
 * `GET /plans`: enabled plans in list order, optionally for one audience.
 * Individuals have none while individual subscriptions are off; an unknown
 * audience matches nothing.
 */
export async function listPlans(audience?: string) {
  const settings = await content.getListingSettings(db)
  const known = AUDIENCES.find((a) => a === audience)
  if (audience && !known) return []
  const rows = await q.listEnabled(db, {
    audience: known,
    withUser: settings.individualSubscriptionsEnabled,
  })
  return rows.map(toPlan)
}

/**
 * `GET /me/subscription`: the active subscription, else the pending one, with
 * its plan, how much of the limit is used, the Featured credits left this
 * period and the plan whose receipt waits for review.
 */
export async function getMySubscription(user: SessionUser) {
  const current = await q.listCurrent(db, user.id)
  const sub = current.find((s) => s.status === "active") ?? current[0]
  const [usage, plan, reviewPlan] = await Promise.all([
    getListingUsage(db, user),
    sub ? q.getPlan(db, sub.planId) : undefined,
    getReviewPlan(db, user.id),
  ])
  return {
    subscription: sub ? toSubscription(sub, usage.used) : null,
    plan: plan ? toPlan(plan) : null,
    usage,
    credits: await getCredits(db, { user, sub, total: plan?.featuredCredits }),
    reviewPlan,
  }
}

// A paid-for plan the admin has not decided on yet.
async function getReviewPlan(ex: Executor, userId: string) {
  const planId = await payments.getPlanUnderReviewId(ex, userId)
  const row = planId ? await q.getPlan(ex, planId) : undefined
  return row ? toPlan(row) : null
}

// Credits come from the active plan; the ones used are the credit promotions
// started since the period began.
async function getCredits(
  ex: Executor,
  of: {
    user: SessionUser
    sub?: { status: string; startsAt: Date }
    total?: number
  }
) {
  const { sub, total = 0 } = of
  if (sub?.status !== "active" || total === 0) return { total: 0, left: 0 }
  const used = await promotions.countCreditsUsed(ex, {
    listingIds: await listIdsOf(ex, of.user.id),
    since: sub.startsAt,
  })
  return { total, left: Math.max(0, total - used) }
}

/** `DELETE /me/chosen-plan`: "keep the free plan"; the account as `GET /me` shows it. */
export function clearChosenPlan(user: SessionUser) {
  return auth.clearChosenPlan(db, user.id)
}
