import type {
  SeedReference,
  SeedReferenceScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./verification.seed-references.queries"

export async function getSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const references: SeedReference[] = []
  const requests = await q.findVerificationRequestReferences(tx, {
    ownerIds: scope.ownerIds,
    businessIds: scope.businessIds,
  })
  for (const req of requests) {
    if (scope.ownerIds.includes(req.ownerId)) {
      references.push({
        referencingDomain: "verification",
        referencingId: req.id,
        referencedDomain: "owner",
        referencedId: req.ownerId,
        reason: "verification_requested_by_owner",
      })
    }
    if (scope.businessIds.includes(req.targetId)) {
      references.push({
        referencingDomain: "verification",
        referencingId: req.id,
        referencedDomain: "business",
        referencedId: req.targetId,
        reason: "verification_target_business",
      })
    }
  }
  const documents = await q.findVerificationDocumentReferences(
    tx,
    scope.uploadIds ?? []
  )
  for (const doc of documents) {
    references.push({
      referencingDomain: "verification",
      referencingId: doc.id,
      referencedDomain: "upload",
      referencedId: doc.uploadId,
      reason: "verification_document_upload",
    })
  }
  return references
}
