import { inArray } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { listings } from "./listings.tables"

/** What a thread needs to know about the listing it is about. */
export function listSubjectRows(ex: Executor, ids: string[]) {
  if (ids.length === 0) return Promise.resolve([])
  return ex
    .select({
      id: listings.id,
      slug: listings.slug,
      ownerUserId: listings.ownerUserId,
      title: listings.title,
    })
    .from(listings)
    .where(inArray(listings.id, ids))
}
