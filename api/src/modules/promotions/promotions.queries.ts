import { and, asc, eq, gt, gte, inArray, lte, ne } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { promotionPrices, promotions } from "./promotions.tables"

export function updateEndedFor(
  ex: Executor,
  change: { listingIds: string[]; at: Date }
) {
  return ex
    .update(promotions)
    .set({ status: "ended", endsAt: change.at })
    .where(
      and(
        inArray(promotions.listingId, change.listingIds),
        eq(promotions.status, "active")
      )
    )
}

export function listRunning(
  ex: Executor,
  scope: { listingIds: string[]; now: Date }
) {
  return ex
    .select({
      listingId: promotions.listingId,
      type: promotions.type,
      startsAt: promotions.startsAt,
      endsAt: promotions.endsAt,
    })
    .from(promotions)
    .where(
      and(
        inArray(promotions.listingId, scope.listingIds),
        eq(promotions.status, "active"),
        ne(promotions.type, "bump"),
        gt(promotions.endsAt, scope.now)
      )
    )
    .orderBy(asc(promotions.startsAt))
}

export function listFeaturedIds(ex: Executor, now: Date) {
  return ex
    .selectDistinct({ id: promotions.listingId })
    .from(promotions)
    .where(
      and(
        eq(promotions.type, "featured"),
        eq(promotions.status, "active"),
        lte(promotions.startsAt, now),
        gte(promotions.endsAt, now)
      )
    )
    .then((rows) => rows.map((row) => row.id))
}

/** Credit promotions of these listings that started at or after `since`. */
export function countCreditsSince(
  ex: Executor,
  scope: { listingIds: string[]; since: Date }
) {
  if (scope.listingIds.length === 0) return Promise.resolve(0)
  return ex.$count(
    promotions,
    and(
      inArray(promotions.listingId, scope.listingIds),
      eq(promotions.source, "credit"),
      gte(promotions.startsAt, scope.since)
    )
  )
}

export function getPromotion(ex: Executor, id: string) {
  return ex
    .select({
      id: promotions.id,
      listingId: promotions.listingId,
      type: promotions.type,
      status: promotions.status,
      durationDays: promotions.durationDays,
    })
    .from(promotions)
    .where(eq(promotions.id, id))
    .then(([row]) => row)
}

export function getPrice(
  ex: Executor,
  of: { type: "featured" | "bump"; durationDays: number }
) {
  return ex
    .select({ price: promotionPrices.price })
    .from(promotionPrices)
    .where(
      and(
        eq(promotionPrices.type, of.type),
        eq(promotionPrices.durationDays, of.durationDays)
      )
    )
    .then(([row]) => row?.price)
}
