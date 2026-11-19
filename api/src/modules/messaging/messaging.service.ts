import type { Executor, Transaction } from "~/shared/db/tx"
import type { DayRange } from "~/shared/time/khartoum"

import * as q from "./messaging.queries"

/**
 * A deleted account's threads go with it, the other side's copy too, as in
 * the mock (A2 "Account deletion").
 */
export async function deleteThreadsOf(tx: Transaction, userId: string) {
  await q.deleteThreadsOf(tx, userId)
}

/** Unread messages from others in the user's threads. */
export function countUnreadMessages(ex: Executor, userId: string) {
  return q.countUnread(ex, userId)
}

/**
 * Messages from others in the user's threads per Khartoum day (or hour), as
 * bucket key to count; buckets without one are left out. `userId` null counts
 * all of them.
 */
export async function countReceivedPerDay(
  ex: Executor,
  userId: string | null,
  days: DayRange
) {
  const rows = await q.listReceivedPerDay(ex, userId, days)
  return new Map(rows.map((row) => [row.day, row.count]))
}

/** Messages from others in the user's listing threads, per listing. */
export async function countReceivedPerListing(
  ex: Executor,
  userId: string,
  days: DayRange
) {
  const rows = await q.listReceivedPerListing(ex, userId, days)
  return new Map(rows.map((row) => [row.listingId, row.count]))
}

/** Messages from others in the user's threads per Khartoum weekday (0 is Sunday) and hour. */
export function countReceivedPerWeekdayHour(
  ex: Executor,
  userId: string | null,
  days: DayRange
) {
  return q.listReceivedPerWeekdayHour(ex, userId, days)
}

/**
 * The user's threads with their messages oldest first, `mine` marking the
 * user's own, as the Responsiveness report reads them (step 11.7-r6).
 */
export async function listThreadsForReport(ex: Executor, userId: string) {
  const rows = await q.listMessagesOfThreads(ex, userId)
  const threads = new Map<
    string,
    {
      id: string
      subjectTitle: { ar: string; en: string }
      messages: { mine: boolean; createdAt: string }[]
    }
  >()
  for (const row of rows) {
    const thread = threads.get(row.threadId) ?? {
      id: row.threadId,
      subjectTitle: row.subjectTitle,
      messages: [],
    }
    thread.messages.push({
      mine: row.senderId === userId,
      createdAt: row.createdAt.toISOString(),
    })
    threads.set(row.threadId, thread)
  }
  return [...threads.values()].sort((a, b) => (a.id < b.id ? -1 : 1))
}

/**
 * The threads of each of these users as `listThreadsForReport` shapes them
 * (without subject titles), keyed by user id; the city rank reads them
 * (step 11.7-r8). Users without a thread are left out.
 */
export async function listThreadsOfUsers(ex: Executor, userIds: string[]) {
  if (userIds.length === 0) return new Map()
  const rows = await q.listMessagesOfUsersThreads(ex, userIds)
  const byUser = new Map<
    string,
    Map<string, { mine: boolean; createdAt: string }[]>
  >()
  for (const row of rows) {
    const threads = byUser.get(row.userId) ?? new Map()
    const list = threads.get(row.threadId) ?? []
    list.push({
      mine: row.senderId === row.userId,
      createdAt: row.createdAt.toISOString(),
    })
    threads.set(row.threadId, list)
    byUser.set(row.userId, threads)
  }
  return new Map(
    [...byUser].map(([userId, threads]) => [
      userId,
      [...threads]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([id, messages]) => ({
          id,
          subjectTitle: { ar: "", en: "" },
          messages,
        })),
    ])
  )
}
