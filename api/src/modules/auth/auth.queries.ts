import { and, eq, isNotNull } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { account, user } from "./auth.tables"

export function getUserLocale(ex: Executor, email: string) {
  return ex
    .select({ locale: user.locale })
    .from(user)
    .where(eq(user.email, email))
    .then(([row]) => row?.locale)
}

export function getUser(ex: Executor, id: string) {
  return ex
    .select()
    .from(user)
    .where(eq(user.id, id))
    .then(([row]) => row)
}

/** A password sign-in exists: false for Google or Facebook only accounts. */
export function hasPassword(ex: Executor, userId: string) {
  return ex
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), isNotNull(account.password)))
    .limit(1)
    .then((rows) => rows.length > 0)
}

/** A timed ban that ended: the account is free again (A6). */
export function updateBanLifted(ex: Executor, id: string) {
  return ex
    .update(user)
    .set({ banned: false, banReason: null, banExpires: null })
    .where(eq(user.id, id))
    .returning()
    .then(([row]) => row)
}
