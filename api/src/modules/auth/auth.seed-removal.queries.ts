import { and, inArray, like } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { account, session, twoFactor, user } from "./auth.tables"

export async function findOwnedSeedUsers(tx: Transaction, ids: string[]) {
  if (!ids.length) return []
  return tx
    .select({
      id: user.id,
      email: user.email,
    })
    .from(user)
    .where(and(inArray(user.id, ids), like(user.email, "%@seed.invalid")))
    .for("update")
}

export async function deleteSeedUserRows(tx: Transaction, ids: string[]) {
  if (!ids.length) return
  await tx.delete(session).where(inArray(session.userId, ids))
  await tx.delete(account).where(inArray(account.userId, ids))
  await tx.delete(twoFactor).where(inArray(twoFactor.userId, ids))
  await tx.delete(user).where(inArray(user.id, ids))
}
