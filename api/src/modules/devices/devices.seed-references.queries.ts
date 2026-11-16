import { inArray } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { devices } from "./devices.tables"

export async function findDeviceUserReferences(
  tx: Transaction,
  ownerIds: string[]
) {
  if (!ownerIds.length) return []
  return tx
    .select({
      id: devices.id,
      userId: devices.userId,
    })
    .from(devices)
    .where(inArray(devices.userId, ownerIds))
}
