import type { Executor } from "~/shared/db/tx"
import type { DayRange } from "~/shared/time/khartoum"

import * as q from "./favorites.queries"

/** Favorites added to these listings inside the days (`null`: every listing). */
export function countNewFavorites(
  ex: Executor,
  listingIds: string[] | null,
  days: DayRange
) {
  if (listingIds?.length === 0) return Promise.resolve(0)
  return q.countAddedIn(ex, listingIds, days)
}
