import type {
  SeedReference,
  SeedReferenceScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./favorites.seed-references.queries"

export async function getSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const rows = await q.findFavoriteSeedReferences(tx, {
    listingIds: scope.listingIds,
    ownerIds: scope.ownerIds,
  })
  return rows.map((row) => ({
    referencingDomain: "favorites",
    referencingId: row.userId,
    referencedDomain: "listing",
    referencedId: row.listingId,
    reason: "user_favorited_listing",
  }))
}
