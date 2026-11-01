import { db } from "~/shared/db/client"
import type { Executor } from "~/shared/db/tx"

import { clock } from "~/shared/time/clock"
import * as uploads from "~/modules/uploads/uploads.service"

import { auth } from "./auth.config"
import { toUser } from "./auth.mapper"
import * as q from "./auth.queries"
import type { SessionUser } from "./auth.types"

/**
 * The account behind a request's session cookie or bearer token, or null.
 * A timed ban that has ended is lifted here, on the person's next request
 * (the ban job does the same for everyone, A6). `headers` carries Better-Auth's
 * refreshed cookie when the session was extended (once a day, A6).
 */
export async function loadViewer(requestHeaders: Headers) {
  const { headers, response } = await auth.api.getSession({
    headers: requestHeaders,
    returnHeaders: true,
  })
  const id = response?.user.id
  const sessionId = response?.session.id
  const row = id ? await q.getUser(db, id) : undefined
  if (!row) return { viewer: null, headers, sessionId }
  if (!isBanOver(row)) return { viewer: row, headers, sessionId }
  const lifted = await q.updateBanLifted(db, row.id)
  return { viewer: lifted ?? row, headers, sessionId }
}

/** `GET /me`: the signed-in account in `userSchema`, or null when signed out. */
export async function getMe(viewer: SessionUser | null) {
  if (!viewer) return null
  const [hasPassword, avatarUrl] = await Promise.all([
    q.hasPassword(db, viewer.id),
    uploads.uploadUrl(db, viewer.avatarUploadId),
  ])
  return toUser(viewer, { hasPassword, avatarUrl })
}

/**
 * Locks the account row until the transaction ends, so two parallel requests
 * that count something the account owns (plan limit) run one after the other.
 */
export async function lockUser(ex: Executor, id: string) {
  await q.lockUser(ex, id)
}

/** The accounts with these ids, as the session middleware loads them. */
export function listUsers(ex: Executor, ids: string[]) {
  return q.listUsers(ex, ids)
}

/** Banned now: a permanent ban, or a timed one that has not ended (A6). */
export function isBannedNow(user: SessionUser) {
  return user.banned && !isBanOver(user)
}

function isBanOver(user: SessionUser) {
  return (
    user.banned && user.banExpires !== null && user.banExpires <= clock.now()
  )
}
