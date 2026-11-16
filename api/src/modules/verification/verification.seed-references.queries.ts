import { inArray, or } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import {
  verificationDocuments,
  verificationRequests,
} from "./verification.tables"

export async function findVerificationRequestReferences(
  tx: Transaction,
  input: { ownerIds: string[]; businessIds: string[] }
) {
  const conditions = []
  if (input.ownerIds.length) {
    conditions.push(inArray(verificationRequests.ownerId, input.ownerIds))
  }
  if (input.businessIds.length) {
    conditions.push(inArray(verificationRequests.targetId, input.businessIds))
  }
  if (!conditions.length) return []
  return tx
    .select({
      id: verificationRequests.id,
      ownerId: verificationRequests.ownerId,
      targetId: verificationRequests.targetId,
      targetType: verificationRequests.targetType,
    })
    .from(verificationRequests)
    .where(or(...conditions))
}

export async function findVerificationDocumentReferences(
  tx: Transaction,
  uploadIds: string[]
) {
  if (!uploadIds.length) return []
  return tx
    .select({
      id: verificationDocuments.id,
      uploadId: verificationDocuments.uploadId,
    })
    .from(verificationDocuments)
    .where(inArray(verificationDocuments.uploadId, uploadIds))
}
