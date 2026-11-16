import type {
  SeedReference,
  SeedReferenceScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./saved-searches.seed-references.queries"

export async function getSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const rows = await q.findSavedSearchUserReferences(tx, scope.ownerIds)
  return rows.map((row) => ({
    referencingDomain: "saved-searches",
    referencingId: row.id,
    referencedDomain: "owner",
    referencedId: row.userId,
    reason: "saved_search_by_owner",
  }))
}
