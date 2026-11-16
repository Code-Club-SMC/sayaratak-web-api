import * as ads from "~/modules/ads/ads.seed-references.service"
import * as analytics from "~/modules/analytics/analytics.seed-references.service"
import * as businessesRemoval from "~/modules/businesses/businesses.seed-removal.service"
import * as devices from "~/modules/devices/devices.seed-references.service"
import * as favorites from "~/modules/favorites/favorites.seed-references.service"
import * as listingsRemoval from "~/modules/listings/listings.seed-removal.service"
import * as messaging from "~/modules/messaging/messaging.seed-references.service"
import * as notifications from "~/modules/notifications/notifications.seed-references.service"
import * as payments from "~/modules/payments/payments.seed-references.service"
import * as plans from "~/modules/plans/plans.seed-references.service"
import * as promotions from "~/modules/promotions/promotions.seed-references.service"
import * as reports from "~/modules/reports/reports.seed-references.service"
import * as reviews from "~/modules/reviews/reviews.seed-references.service"
import * as savedSearches from "~/modules/saved-searches/saved-searches.seed-references.service"
import * as verification from "~/modules/verification/verification.seed-references.service"
import type { Transaction } from "~/shared/db/tx"

import type {
  SeedReference,
  SeedReferenceScope,
} from "./admin-seed.references.types"

async function collectAllSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const batches = await Promise.all([
    favorites.getSeedReferences(tx, scope),
    messaging.getSeedReferences(tx, scope),
    reviews.getSeedReferences(tx, scope),
    reports.getSeedReferences(tx, scope),
    payments.getSeedReferences(tx, scope),
    promotions.getSeedReferences(tx, scope),
    plans.getSeedReferences(tx, scope),
    ads.getSeedReferences(tx, scope),
    analytics.getSeedReferences(tx, scope),
    notifications.getSeedReferences(tx, scope),
    verification.getSeedReferences(tx, scope),
    devices.getSeedReferences(tx, scope),
    savedSearches.getSeedReferences(tx, scope),
  ])
  return batches.flat()
}

/** Resolves incoming references from all 13 domains and expands transitive closure. */
export async function resolveTransitiveProtection(
  tx: Transaction,
  scope: SeedReferenceScope
) {
  const references = await collectAllSeedReferences(tx, scope)
  const protectedListings = new Set<string>()
  const protectedBusinesses = new Set<string>()
  const protectedOwners = new Set<string>()
  const protectedUploads = new Set<string>()

  for (const ref of references) {
    if (ref.referencedDomain === "listing")
      protectedListings.add(ref.referencedId)
    else if (ref.referencedDomain === "business")
      protectedBusinesses.add(ref.referencedId)
    else if (ref.referencedDomain === "owner")
      protectedOwners.add(ref.referencedId)
    else if (ref.referencedDomain === "upload")
      protectedUploads.add(ref.referencedId)
  }

  await expandListingProtection(tx, protectedListings, {
    owners: protectedOwners,
    uploads: protectedUploads,
  })
  await expandBusinessProtection(tx, protectedBusinesses, {
    owners: protectedOwners,
    uploads: protectedUploads,
  })

  return {
    references,
    protectedListings,
    protectedBusinesses,
    protectedOwners,
    protectedUploads,
  }
}

async function expandListingProtection(
  tx: Transaction,
  listingIds: Set<string>,
  target: { owners: Set<string>; uploads: Set<string> }
) {
  if (listingIds.size === 0) return
  const deps = await listingsRemoval.getListingDependents(
    tx,
    Array.from(listingIds)
  )
  for (const dep of deps) {
    if (dep.ownerUserId) target.owners.add(dep.ownerUserId)
    for (const u of dep.uploadIds) target.uploads.add(u)
  }
}

async function expandBusinessProtection(
  tx: Transaction,
  businessIds: Set<string>,
  target: { owners: Set<string>; uploads: Set<string> }
) {
  if (businessIds.size === 0) return
  const deps = await businessesRemoval.getBusinessDependents(
    tx,
    Array.from(businessIds)
  )
  for (const dep of deps) {
    if (dep.ownerUserId) target.owners.add(dep.ownerUserId)
    for (const u of dep.uploadIds) target.uploads.add(u)
  }
}
