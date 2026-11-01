import { and, asc, eq, gt, inArray, ne } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { promotions } from "./promotions.tables"

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
