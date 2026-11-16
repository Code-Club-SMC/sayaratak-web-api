import type {
  SeedReference,
  SeedReferenceScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./promotions.seed-references.queries"

export async function getSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const rows = await q.findPromotionReferences(tx, scope.listingIds)
  return rows.map((row) => ({
    referencingDomain: "promotions",
    referencingId: row.id,
    referencedDomain: "listing",
    referencedId: row.listingId,
    reason: "promotion_on_listing",
  }))
}
