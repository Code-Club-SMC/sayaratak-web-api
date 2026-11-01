import { db } from "~/shared/db/client"
import type { Executor } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"

import { toSite } from "./content.mapper"
import * as q from "./content.queries"

/** The public site details: contact and locales only, never banking or moderation settings. */
export async function getSite() {
  const row = await q.getSettings(db)
  // db:bootstrap writes the one settings row; a database without it has no site to show.
  if (!row) fail.notFound()
  return toSite(row)
}

/** The admin settings that shape listings: expiry days, auto-approval and the free limit. */
export async function getListingSettings(ex: Executor) {
  const row = await q.getSettings(ex)
  if (!row) fail.notFound()
  return {
    autoApproveVerifiedDealers: row.autoApproveVerifiedDealers,
    listingExpiryDays: row.listingExpiryDays,
    individualSubscriptionsEnabled: row.individualSubscriptionsEnabled,
    freeListingLimit: row.freeListingLimit,
  }
}
