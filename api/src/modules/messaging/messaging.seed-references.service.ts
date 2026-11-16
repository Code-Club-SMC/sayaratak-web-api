import type {
  SeedReference,
  SeedReferenceScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./messaging.seed-references.queries"

export async function getSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const references: SeedReference[] = []
  const subjectIds = [...scope.listingIds, ...scope.businessIds]
  const threadRows = await q.findSubjectThreads(tx, subjectIds)
  for (const row of threadRows) {
    const isListing = row.subjectType === "listing"
    references.push({
      referencingDomain: "messaging",
      referencingId: row.id,
      referencedDomain: isListing ? "listing" : "business",
      referencedId: row.subjectId,
      reason: "thread_references_subject",
    })
  }
  const participantRows = await q.findParticipantThreads(tx, scope.ownerIds)
  for (const row of participantRows) {
    references.push({
      referencingDomain: "messaging",
      referencingId: row.threadId,
      referencedDomain: "owner",
      referencedId: row.userId,
      reason: "thread_involves_owner",
    })
  }
  return references
}
