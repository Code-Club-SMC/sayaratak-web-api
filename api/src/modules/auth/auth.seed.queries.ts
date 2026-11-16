import { eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { type NewUserRow, session, user } from "./auth.tables"

export function lockSeedOwner(ex: Executor, id: string) {
  // Owner locks precede public-record locks during installation and removal.
  return ex
    .select()
    .from(user)
    .where(eq(user.id, id))
    .for("update")
    .then(([row]) => row)
}

export function insertSeedOwner(ex: Executor, row: NewUserRow) {
  // Deliberately no upsert: a collision must roll the entire batch back.
  return ex.insert(user).values(row)
}

export function getSessionUserIdByToken(ex: Executor, token: string) {
  return ex
    .select({ userId: session.userId })
    .from(session)
    .where(eq(session.token, token))
    .then(([row]) => row?.userId)
}
