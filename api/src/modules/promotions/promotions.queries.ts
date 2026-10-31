import { and, eq, inArray } from "drizzle-orm"

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
