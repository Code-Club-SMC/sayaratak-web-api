import { inArray } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { threadParticipants, threads } from "./messaging.tables"

export async function findSubjectThreads(
  tx: Transaction,
  subjectIds: string[]
) {
  if (!subjectIds.length) return []
  return tx
    .select({
      id: threads.id,
      subjectType: threads.subjectType,
      subjectId: threads.subjectId,
    })
    .from(threads)
    .where(inArray(threads.subjectId, subjectIds))
}

export async function findParticipantThreads(
  tx: Transaction,
  ownerIds: string[]
) {
  if (!ownerIds.length) return []
  return tx
    .select({
      threadId: threadParticipants.threadId,
      userId: threadParticipants.userId,
    })
    .from(threadParticipants)
    .where(inArray(threadParticipants.userId, ownerIds))
}
