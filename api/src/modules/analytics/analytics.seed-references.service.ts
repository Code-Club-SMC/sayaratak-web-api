import type {
  SeedReference,
  SeedReferenceScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./analytics.seed-references.queries"

export async function getSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const targetIds = [...scope.listingIds, ...scope.businessIds]
  const rows = await q.findAnalyticsEvents(tx, targetIds)
  return rows.map((row) => ({
    referencingDomain: "analytics",
    referencingId: `${row.targetId}:${row.type}`,
    referencedDomain: scope.listingIds.includes(row.targetId)
      ? "listing"
      : "business",
    referencedId: row.targetId,
    reason: "analytics_event_for_target",
  }))
}
