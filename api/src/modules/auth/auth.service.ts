import { db } from "~/shared/db/client"

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
  const row = id ? await q.getUser(db, id) : undefined
  if (!row) return { viewer: null, headers }
  if (!isBanOver(row)) return { viewer: row, headers }
  const lifted = await q.updateBanLifted(db, row.id)
  return { viewer: lifted ?? row, headers }
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

/** Banned now: a permanent ban, or a timed one that has not ended (A6). */
export function isBannedNow(user: SessionUser) {
  return user.banned && !isBanOver(user)
}

function isBanOver(user: SessionUser) {
  return (
    user.banned && user.banExpires !== null && user.banExpires <= clock.now()
  )
}
