import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { listings, listingStats } from "./listings.tables"

/** Moves the saved-by counter of each listing by `delta`, never below 0. */
export function bumpFavorites(ex: Executor, ids: string[], delta: 1 | -1) {
  if (ids.length === 0) return Promise.resolve()
  return ex
    .update(listingStats)
    .set({ favorites: sql`greatest(0, ${listingStats.favorites} + ${delta})` })
    .where(inArray(listingStats.listingId, ids))
}

/** Approved vehicle listings with a make, as the Demand report reads the market (step 11.7-r6), in id order. */
export function listDemandRows(ex: Executor) {
  return ex
    .select({
      id: listings.id,
      ownerUserId: listings.ownerUserId,
      makeId: listings.makeId,
      modelId: listings.modelId,
      cityId: listings.cityId,
      status: listings.status,
      expiresAt: listings.expiresAt,
    })
    .from(listings)
    .where(
      and(
        eq(listings.moderation, "approved"),
        eq(listings.kind, "vehicle"),
        eq(listings.seedHidden, false),
        isNotNull(listings.makeId)
      )
    )
    .orderBy(asc(listings.id))
}
