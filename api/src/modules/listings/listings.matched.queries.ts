import type { SearchParams } from "@sayaratak/shared/search/schemas"
import { and, gte, isNull, lt, ne, or, sql } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { type SearchScope, searchWhere } from "./listings.filters.queries"
import { listings } from "./listings.tables"

/**
 * When each listing of others that fits the search went public (the admin
 * decision, else creation) inside `[since, until)`: the saved-search Alerts
 * report counts matches from the listings (step 11.7-r9).
 */
export async function listMatchedAt(
  ex: Executor,
  find: {
    params: SearchParams
    scope: SearchScope
    since: Date
    until: Date
    exceptOwnerId: string
  }
) {
  const at =
    sql`coalesce(${listings.decidedAt}, ${listings.createdAt})`.mapWith(
      listings.createdAt
    )
  const rows = await ex
    .select({ at })
    .from(listings)
    .where(
      and(
        searchWhere(find.params, find.scope),
        gte(at, find.since),
        lt(at, find.until),
        or(
          isNull(listings.ownerUserId),
          ne(listings.ownerUserId, find.exceptOwnerId)
        )
      )
    )
  return rows.map((row) => row.at.toISOString())
}
