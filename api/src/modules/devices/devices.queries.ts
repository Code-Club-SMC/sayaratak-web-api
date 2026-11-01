import { and, eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { type NewDeviceRow, devices } from "./devices.tables"

/** Registers a device, or moves and refreshes the one that already has this token. */
export function upsert(ex: Executor, row: NewDeviceRow) {
  return ex
    .insert(devices)
    .values(row)
    .onConflictDoUpdate({
      target: devices.fcmToken,
      set: {
        userId: row.userId,
        platform: row.platform,
        appVersion: row.appVersion,
        locale: row.locale,
        lastSeenAt: row.lastSeenAt,
      },
    })
}

/** Removes the user's device with this token; one that is someone else's stays. */
export function removeOf(
  ex: Executor,
  find: { userId: string; fcmToken: string }
) {
  return ex
    .delete(devices)
    .where(
      and(eq(devices.userId, find.userId), eq(devices.fcmToken, find.fcmToken))
    )
}

export function listOf(ex: Executor, userId: string) {
  return ex.select().from(devices).where(eq(devices.userId, userId))
}

export function getById(ex: Executor, id: string) {
  return ex
    .select()
    .from(devices)
    .where(eq(devices.id, id))
    .then(([row]) => row)
}

export function removeById(ex: Executor, id: string) {
  return ex.delete(devices).where(eq(devices.id, id))
}
