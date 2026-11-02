import { and, eq, gt, inArray, isNull, or, sql } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { user } from "./auth.tables"

export function lockUser(ex: Executor, id: string) {
  return ex
    .select()
    .from(user)
    .where(eq(user.id, id))
    .for("update")
    .then(([row]) => row)
}

export function listUsers(ex: Executor, ids: string[]) {
  if (ids.length === 0) return Promise.resolve([])
  return ex.select().from(user).where(inArray(user.id, ids))
}

/** Ids of accounts banned at `now`: a permanent ban, or a timed one not yet over. */
export function listBannedIds(ex: Executor, now: Date) {
  return ex
    .select({ id: user.id })
    .from(user)
    .where(
      and(
        eq(user.banned, true),
        or(isNull(user.banExpires), gt(user.banExpires, now))
      )
    )
    .then((rows) => rows.map((row) => row.id))
}

export function listPhoneVerifiedIds(ex: Executor) {
  return ex
    .select({ id: user.id })
    .from(user)
    .where(eq(user.verifiedPhone, true))
    .then((rows) => rows.map((row) => row.id))
}

/** Ids of accounts whose name holds `term` (already lower case). */
export function listIdsNamed(ex: Executor, term: string) {
  return ex
    .select({ id: user.id })
    .from(user)
    .where(sql`strpos(lower(${user.name}), ${term}) > 0`)
    .then((rows) => rows.map((row) => row.id))
}
