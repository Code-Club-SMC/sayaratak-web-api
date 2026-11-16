import type {
  SeedReference,
  SeedReferenceScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./notifications.seed-references.queries"

export async function getSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const references: SeedReference[] = []
  const nRows = await q.findNotificationUserReferences(tx, scope.ownerIds)
  for (const row of nRows) {
    references.push({
      referencingDomain: "notifications",
      referencingId: row.id,
      referencedDomain: "owner",
      referencedId: row.userId,
      reason: "notification_sent_to_owner",
    })
  }
  const bRows = await q.findBroadcastSenderReferences(tx, scope.ownerIds)
  for (const row of bRows) {
    if (row.sentBy) {
      references.push({
        referencingDomain: "notifications",
        referencingId: row.id,
        referencedDomain: "owner",
        referencedId: row.sentBy,
        reason: "broadcast_sent_by_owner",
      })
    }
  }
  return references
}
