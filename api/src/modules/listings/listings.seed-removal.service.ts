import type {
  SeedRemovalResult,
  SeedRemovalScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"

import * as q from "./listings.seed-removal.queries"

export function hideSeedRecords(
  tx: Transaction,
  datasetId: string
): Promise<number> {
  return q.hideListingsByDataset(tx, datasetId)
}

export async function getListingDependents(
  tx: Transaction,
  listingIds: string[]
) {
  if (!listingIds.length) return []
  const [rows, media] = await Promise.all([
    q.findOwnedListings(tx, { datasetId: "", ids: listingIds }),
    q.findListingMedia(tx, listingIds),
  ])
  const mediaByListing = new Map<string, string[]>()
  for (const item of media) {
    const list = mediaByListing.get(item.listingId) ?? []
    list.push(item.uploadId)
    mediaByListing.set(item.listingId, list)
  }
  return rows.map((row) => ({
    id: row.id,
    ownerUserId: row.ownerUserId,
    uploadIds: mediaByListing.get(row.id) ?? [],
  }))
}

export async function removeSeedRecords(
  tx: Transaction,
  scope: SeedRemovalScope
): Promise<SeedRemovalResult> {
  const protectedSet = new Set(scope.orderedProtectedIds)
  const rows = await q.findOwnedListings(tx, {
    datasetId: scope.datasetId,
    ids: scope.orderedOwnedIds,
  })
  const rowMap = new Map(rows.map((r) => [r.id, r]))
  const toDelete: string[] = []
  const alreadyMissingIds: string[] = []
  const retained: Array<{ id: string; reason: string }> = []

  for (const id of scope.orderedOwnedIds) {
    const row = rowMap.get(id)
    if (!row) {
      alreadyMissingIds.push(id)
      continue
    }
    if (row.seedDatasetId !== scope.datasetId) fail.conflict()
    if (protectedSet.has(id)) {
      retained.push({ id, reason: "has_real_references" })
    } else {
      toDelete.push(id)
    }
  }

  await q.deleteListingRows(tx, toDelete)
  return {
    domain: "listing",
    deletedIds: toDelete,
    alreadyMissingIds,
    retained,
  }
}
