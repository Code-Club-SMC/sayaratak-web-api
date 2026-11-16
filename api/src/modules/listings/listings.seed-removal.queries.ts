import { and, eq, inArray } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { listingMedia, listings, listingStats } from "./listings.tables"

export async function hideListingsByDataset(
  tx: Transaction,
  datasetId: string
) {
  const result = await tx
    .update(listings)
    .set({ seedHidden: true })
    .where(
      and(eq(listings.seedDatasetId, datasetId), eq(listings.seedHidden, false))
    )
    .returning({ id: listings.id })
  return result.length
}

export async function findOwnedListings(
  tx: Transaction,
  input: { datasetId: string; ids: string[] }
) {
  if (!input.ids.length) return []
  return tx
    .select({
      id: listings.id,
      seedDatasetId: listings.seedDatasetId,
      ownerUserId: listings.ownerUserId,
    })
    .from(listings)
    .where(inArray(listings.id, input.ids))
    .for("update")
}

export async function findListingMedia(tx: Transaction, listingIds: string[]) {
  if (!listingIds.length) return []
  return tx
    .select({
      listingId: listingMedia.listingId,
      uploadId: listingMedia.uploadId,
    })
    .from(listingMedia)
    .where(inArray(listingMedia.listingId, listingIds))
}

export async function deleteListingRows(tx: Transaction, ids: string[]) {
  if (!ids.length) return
  await tx.delete(listingMedia).where(inArray(listingMedia.listingId, ids))
  await tx.delete(listingStats).where(inArray(listingStats.listingId, ids))
  await tx.delete(listings).where(inArray(listings.id, ids))
}
