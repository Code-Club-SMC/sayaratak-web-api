import { and, eq, inArray, isNull, ne } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { messages, threadParticipants, threads } from "./messaging.tables"

export function deleteThreadsOf(ex: Executor, userId: string) {
  return ex.delete(threads).where(inArray(threads.id, threadIdsOf(ex, userId)))
}

/** Messages from the other side, not read yet, in the user's threads. */
export function countUnread(ex: Executor, userId: string) {
  return ex.$count(
    messages,
    and(
      inArray(messages.threadId, threadIdsOf(ex, userId)),
      ne(messages.senderId, userId),
      isNull(messages.readAt)
    )
  )
}

function threadIdsOf(ex: Executor, userId: string) {
  return ex
    .select({ id: threadParticipants.threadId })
    .from(threadParticipants)
    .where(eq(threadParticipants.userId, userId))
}
