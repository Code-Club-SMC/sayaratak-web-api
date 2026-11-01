import { eq, inArray } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { dealerships, mechanics, workshops } from "./businesses.tables"

/** The id of the one business profile the user owns, of any kind. */
export async function getIdOfOwner(ex: Executor, ownerUserId: string) {
  // One account has one business, so at most one of the three answers.
  const found = await Promise.all(
    [dealerships, workshops, mechanics].map((table) =>
      ex
        .select({ id: table.id })
        .from(table)
        .where(eq(table.ownerUserId, ownerUserId))
        .then(([row]) => row?.id)
    )
  )
  return found.find(Boolean)
}

export function getDealershipOf(ex: Executor, ownerUserId: string) {
  return ex
    .select()
    .from(dealerships)
    .where(eq(dealerships.ownerUserId, ownerUserId))
    .then(([row]) => row)
}

export function listDealershipsOf(ex: Executor, ownerUserIds: string[]) {
  if (ownerUserIds.length === 0) return Promise.resolve([])
  return ex
    .select()
    .from(dealerships)
    .where(inArray(dealerships.ownerUserId, ownerUserIds))
}

/** Owners of a suspended dealership, workshop or mechanic profile. */
export async function listSuspendedOwnerIds(ex: Executor) {
  const lists = await Promise.all(
    [dealerships, workshops, mechanics].map((table) =>
      ex
        .select({ id: table.ownerUserId })
        .from(table)
        .where(eq(table.status, "suspended"))
    )
  )
  return lists.flat().map((row) => row.id)
}

export function listVerifiedDealershipOwnerIds(ex: Executor) {
  return ex
    .select({ id: dealerships.ownerUserId })
    .from(dealerships)
    .where(eq(dealerships.verified, true))
    .then((rows) => rows.map((row) => row.id))
}
