import type {
  SeedReference,
  SeedReferenceScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./plans.seed-references.queries"

export async function getSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const rows = await q.findSubscriptionReferences(tx, scope.ownerIds)
  return rows.map((row) => ({
    referencingDomain: "plans",
    referencingId: row.id,
    referencedDomain: "owner",
    referencedId: row.userId,
    reason: "subscription_for_owner",
  }))
}
