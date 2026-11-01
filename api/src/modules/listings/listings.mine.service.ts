import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import type { SessionUser } from "~/modules/auth/auth.types"

import * as q from "./listings.mine.queries"
import { toListings } from "./listings.view.service"

// 20 a page; up to 500 for the CSV export (A11). `limit` asks 1 to 24, as everywhere.
const DEFAULT_SIZE = 20
const MAX_SIZE = 500
const LIMIT_MAX = 24

/** Raw query values of `GET /me/listings`, read as the mock reads them. */
export type MineQuery = Partial<
  Record<
    | "tab"
    | "q"
    | "type"
    | "intent"
    | "moderation"
    | "status"
    | "needsAttention"
    | "sort"
    | "dir"
    | "page"
    | "pageSize"
    | "limit",
    string
  >
>

/**
 * `GET /me/listings`: the owner's listings by tab and filters, newest first
 * unless sorted, exact pins (the owner sees their own).
 * Example: `tab=active&sort=expires&dir=asc&pageSize=500` for the CSV.
 */
export async function listMyListings(user: SessionUser, query: MineQuery) {
  const page = Math.max(1, Math.floor(Number(query.page)) || 1)
  const size = pageSizeOf(query)
  const found = await q.listMine(db, {
    ownerUserId: user.id,
    now: clock.now(),
    tab: query.tab ?? "all",
    q: query.q?.toLowerCase() || undefined,
    type: query.type,
    intent: query.intent,
    moderation: query.moderation,
    status: query.status,
    needsAttention: query.needsAttention === "true",
    sort: query.sort,
    dir: query.dir === "asc" ? "asc" : "desc",
    page: { offset: (page - 1) * size, size },
  })
  return {
    items: await toListings(db, found.rows, user),
    total: found.total,
    page,
    pageSize: size,
  }
}

// Mock `pageParams(query, 20, 500)`.
function pageSizeOf(query: MineQuery) {
  const limit = Math.floor(Number(query.limit))
  if (limit) return Math.min(LIMIT_MAX, Math.max(1, limit))
  const asked = Math.floor(Number(query.pageSize)) || DEFAULT_SIZE
  return Math.min(MAX_SIZE, Math.max(1, asked))
}
