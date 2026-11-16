import { inArray } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { broadcasts, notifications } from "./notifications.tables"

export async function findNotificationUserReferences(
  tx: Transaction,
  ownerIds: string[]
) {
  if (!ownerIds.length) return []
  return tx
    .select({
      id: notifications.id,
      userId: notifications.userId,
    })
    .from(notifications)
    .where(inArray(notifications.userId, ownerIds))
}

export async function findBroadcastSenderReferences(
  tx: Transaction,
  ownerIds: string[]
) {
  if (!ownerIds.length) return []
  return tx
    .select({
      id: broadcasts.id,
      sentBy: broadcasts.sentBy,
    })
    .from(broadcasts)
    .where(inArray(broadcasts.sentBy, ownerIds))
}
