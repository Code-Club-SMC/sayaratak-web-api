import type {
  SeedReference,
  SeedReferenceScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./payments.seed-references.queries"

export async function getSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const references: SeedReference[] = []
  const itemIds = [...scope.listingIds, ...scope.businessIds]
  const rows = await q.findPaymentReferences(tx, {
    ownerIds: scope.ownerIds,
    uploadIds: scope.uploadIds ?? [],
    itemIds,
  })
  for (const row of rows) {
    if (row.userId && scope.ownerIds.includes(row.userId)) {
      references.push({
        referencingDomain: "payments",
        referencingId: row.id,
        referencedDomain: "owner",
        referencedId: row.userId,
        reason: "payment_payer_is_owner",
      })
    }
    if (scope.uploadIds?.includes(row.receiptUploadId)) {
      references.push({
        referencingDomain: "payments",
        referencingId: row.id,
        referencedDomain: "upload",
        referencedId: row.receiptUploadId,
        reason: "payment_receipt_upload",
      })
    }
    if (scope.listingIds.includes(row.itemId)) {
      references.push({
        referencingDomain: "payments",
        referencingId: row.id,
        referencedDomain: "listing",
        referencedId: row.itemId,
        reason: "payment_for_listing",
      })
    }
  }
  return references
}
