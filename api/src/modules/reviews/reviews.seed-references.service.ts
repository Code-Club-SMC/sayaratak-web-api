import type {
  SeedReference,
  SeedReferenceScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./reviews.seed-references.queries"

export async function getSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const references: SeedReference[] = []
  const targetRows = await q.findTargetReviews(tx, scope.businessIds)
  for (const row of targetRows) {
    references.push({
      referencingDomain: "reviews",
      referencingId: row.id,
      referencedDomain: "business",
      referencedId: row.targetId,
      reason: "review_targets_business",
    })
  }
  const authorRows = await q.findAuthorReviews(tx, scope.ownerIds)
  for (const row of authorRows) {
    if (row.authorId) {
      references.push({
        referencingDomain: "reviews",
        referencingId: row.id,
        referencedDomain: "owner",
        referencedId: row.authorId,
        reason: "review_authored_by_owner",
      })
    }
  }
  return references
}
