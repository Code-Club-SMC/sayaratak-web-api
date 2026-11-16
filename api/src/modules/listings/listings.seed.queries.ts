import { and, eq, isNotNull, or } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { listings } from "./listings.tables"

export function hasPublicSeedContent(ex: Executor) {
  return ex
    .select({ id: listings.id })
    .from(listings)
    .where(
      and(
        isNotNull(listings.seedDatasetId),
        eq(listings.seedHidden, false),
        eq(listings.moderation, "approved")
      )
    )
    .limit(1)
    .then((rows) => rows.length > 0)
}

export function lockSeedListingCollision(
  ex: Executor,
  record: { id: string; slug: string }
) {
  // Never overwrite either an existing stable ID or an existing public slug.
  return ex
    .select({ id: listings.id })
    .from(listings)
    .where(or(eq(listings.id, record.id), eq(listings.slug, record.slug)))
    .for("update")
    .then((rows) => rows.length > 0)
}
