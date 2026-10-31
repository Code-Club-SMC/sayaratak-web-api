import type { NotificationPrefs } from "@sayaratak/shared/schemas/api"
import { and, eq, isNotNull, ne, type SQL } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { account, type NewUserRow, user } from "./auth.tables"

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

export function updateProfile(
  ex: Executor,
  id: string,
  fields: Partial<NewUserRow>
) {
  return ex
    .update(user)
    .set(fields)
    .where(eq(user.id, id))
    .returning()
    .then(([row]) => row)
}

export function updatePrefs(
  ex: Executor,
  id: string,
  prefs: NotificationPrefs
) {
  return ex.update(user).set({ prefs }).where(eq(user.id, id))
}

export function hasOtherWithEmail(
  ex: Executor,
  match: { email: string; userId: string }
) {
  return hasOther(ex, eq(user.email, match.email), match.userId)
}

export function hasOtherWithPhone(
  ex: Executor,
  match: { phone: string; userId: string }
) {
  return hasOther(ex, eq(user.phone, match.phone), match.userId)
}

export function deleteUser(ex: Executor, id: string) {
  return ex.delete(user).where(eq(user.id, id))
}

function hasOther(ex: Executor, where: SQL, userId: string) {
  return ex
    .select({ id: user.id })
    .from(user)
    .where(and(where, ne(user.id, userId)))
    .limit(1)
    .then((rows) => rows.length > 0)
}
