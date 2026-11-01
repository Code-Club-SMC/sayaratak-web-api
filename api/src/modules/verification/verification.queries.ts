import { and, asc, desc, eq, inArray } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import {
  verificationDocuments,
  verificationRequests,
} from "./verification.tables"

export type RequestRow = typeof verificationRequests.$inferSelect
export type NewRequestRow = typeof verificationRequests.$inferInsert
export type NewDocumentRow = typeof verificationDocuments.$inferInsert

export function countPending(ex: Executor) {
  return ex.$count(
    verificationRequests,
    eq(verificationRequests.status, "pending")
  )
}

/** The owner's newest request, whatever its state. */
export function getLatestOf(ex: Executor, ownerId: string) {
  return ex
    .select()
    .from(verificationRequests)
    .where(eq(verificationRequests.ownerId, ownerId))
    .orderBy(
      desc(verificationRequests.createdAt),
      desc(verificationRequests.id)
    )
    .limit(1)
    .then(([row]) => row)
}

/** Whether the business already has a request waiting for an admin. */
export function hasPendingFor(
  ex: Executor,
  business: Pick<RequestRow, "targetType" | "targetId">
) {
  return ex
    .select({ id: verificationRequests.id })
    .from(verificationRequests)
    .where(
      and(
        eq(verificationRequests.targetType, business.targetType),
        eq(verificationRequests.targetId, business.targetId),
        eq(verificationRequests.status, "pending")
      )
    )
    .limit(1)
    .then((rows) => rows.length > 0)
}

/** Adds the request unless the business got a pending one meanwhile (the unique index); then `undefined`. */
export function insertIfNone(ex: Executor, row: NewRequestRow) {
  return ex
    .insert(verificationRequests)
    .values(row)
    .onConflictDoNothing()
    .returning()
    .then(([inserted]) => inserted)
}

export function insertDocuments(ex: Executor, rows: NewDocumentRow[]) {
  return ex.insert(verificationDocuments).values(rows)
}

/** The documents of these requests, in the order they were sent. */
export function listDocuments(ex: Executor, requestIds: string[]) {
  return ex
    .select()
    .from(verificationDocuments)
    .where(inArray(verificationDocuments.requestId, requestIds))
    .orderBy(
      asc(verificationDocuments.requestId),
      asc(verificationDocuments.position)
    )
}
