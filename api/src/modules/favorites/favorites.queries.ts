import { and, inArray } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"
import { type DayRange, withinDays } from "~/shared/time/khartoum"

import { favorites } from "./favorites.tables"

/** Favorites added inside the days to these listings; `null` means every listing. */
export function countAddedIn(
  ex: Executor,
  listingIds: string[] | null,
  days: DayRange
) {
  return ex.$count(
    favorites,
    and(
      withinDays(favorites.createdAt, days),
      listingIds ? inArray(favorites.listingId, listingIds) : undefined
    )
  )
}
