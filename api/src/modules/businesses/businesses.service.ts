import type { Executor } from "~/shared/db/tx"

import * as q from "./businesses.queries"

/** The id of the dealership, workshop or mechanic profile the user owns, if any. */
export function getBusinessIdOf(ex: Executor, ownerUserId: string) {
  return q.getIdOfOwner(ex, ownerUserId)
}

/** The dealership the user owns, if any. */
export function getDealershipOf(ex: Executor, ownerUserId: string) {
  return q.getDealershipOf(ex, ownerUserId)
}

/** The dealerships of these owners, keyed by owner id. */
export async function getDealershipsOf(ex: Executor, ownerUserIds: string[]) {
  const rows = await q.listDealershipsOf(ex, ownerUserIds)
  return new Map(rows.map((row) => [row.ownerUserId, row]))
}

/** Owners whose business is suspended; their listings leave the public site. */
export function listSuspendedOwnerIds(ex: Executor) {
  return q.listSuspendedOwnerIds(ex)
}

/** Owners of a verified dealership: its listings show it as verified. */
export function listVerifiedDealershipOwnerIds(ex: Executor) {
  return q.listVerifiedDealershipOwnerIds(ex)
}
