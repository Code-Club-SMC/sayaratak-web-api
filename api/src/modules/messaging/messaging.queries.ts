import { and, count, eq, inArray, isNull, ne } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"
import {
  bucketColumn,
  type DayRange,
  weekdayHourColumns,
  withinDays,
} from "~/shared/time/khartoum"

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

/**
 * Messages per Khartoum day (or hour) that other people sent in the user's threads;
 * `userId` null counts every message of every thread (the admin's view).
 */
export function listReceivedPerDay(
  ex: Executor,
  userId: string | null,
  days: DayRange
) {
  const day = bucketColumn(messages.createdAt, days)
  return ex
    .select({ day, count: count() })
    .from(messages)
    .where(and(withinDays(messages.createdAt, days), receivedBy(ex, userId)))
    .groupBy(day)
}

/** Messages others sent in the user's threads (`null`: every thread) per Khartoum weekday and hour inside `days`. */
export function listReceivedPerWeekdayHour(
  ex: Executor,
  userId: string | null,
  days: DayRange
) {
  const { weekday, hour } = weekdayHourColumns(messages.createdAt)
  return ex
    .select({ weekday, hour, count: count() })
    .from(messages)
    .where(and(withinDays(messages.createdAt, days), receivedBy(ex, userId)))
    .groupBy(weekday, hour)
}

/** Messages others sent per listing thread subject, for the user's listings, inside `days`. */
export function listReceivedPerListing(
  ex: Executor,
  userId: string,
  days: DayRange
) {
  return ex
    .select({ listingId: threads.subjectId, count: count() })
    .from(messages)
    .innerJoin(threads, eq(threads.id, messages.threadId))
    .where(
      and(
        eq(threads.subjectType, "listing"),
        withinDays(messages.createdAt, days),
        receivedBy(ex, userId)
      )
    )
    .groupBy(threads.subjectId)
}

function receivedBy(ex: Executor, userId: string | null) {
  return userId
    ? and(
        inArray(messages.threadId, threadIdsOf(ex, userId)),
        ne(messages.senderId, userId)
      )
    : undefined
}

function threadIdsOf(ex: Executor, userId: string) {
  return ex
    .select({ id: threadParticipants.threadId })
    .from(threadParticipants)
    .where(eq(threadParticipants.userId, userId))
}
