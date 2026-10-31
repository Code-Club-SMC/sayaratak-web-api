import { and, eq, isNull } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { notifications } from "./notifications.tables"

export function countUnread(ex: Executor, userId: string) {
  return ex.$count(
    notifications,
    and(eq(notifications.userId, userId), isNull(notifications.readAt))
  )
}
