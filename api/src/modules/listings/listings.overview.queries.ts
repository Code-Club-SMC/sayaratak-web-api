import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  sql,
} from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"
import { type DayRange, dayColumn, withinDays } from "~/shared/time/khartoum"

import { listings } from "./listings.tables"

// Ids run `l00001`, `l00002`, ...: all the same length, so id order is the mock's array order.

export function countApproved(ex: Executor) {
  return ex.$count(listings, eq(listings.moderation, "approved"))
}

export function countApprovedVehicles(ex: Executor) {
  return ex.$count(
    listings,
    and(eq(listings.moderation, "approved"), eq(listings.kind, "vehicle"))
  )
}

/** Listings of any state, drafts too, created per Khartoum day inside `days`. */
export function listCreatedPerDay(ex: Executor, days: DayRange) {
  const day = dayColumn(listings.createdAt)
  return ex
    .select({ day, count: count() })
    .from(listings)
    .where(withinDays(listings.createdAt, days))
    .groupBy(day)
}

/** The newest listings that were sent in (not drafts), ties in id order. */
export function listNewestSubmitted(ex: Executor, limit: number) {
  return ex
    .select({
      id: listings.id,
      title: listings.title,
      moderation: listings.moderation,
      createdAt: listings.createdAt,
    })
    .from(listings)
    .where(ne(listings.moderation, "draft"))
    .orderBy(desc(listings.createdAt), asc(listings.id))
    .limit(limit)
}

/** Listings of any state whose title or id holds the pattern. */
export function search(ex: Executor, find: { pattern: string; limit: number }) {
  return ex
    .select({
      id: listings.id,
      title: listings.title,
      moderation: listings.moderation,
    })
    .from(listings)
    .where(
      or(ilike(listings.title, find.pattern), ilike(listings.id, find.pattern))
    )
    .orderBy(asc(sql`length(${listings.id})`), asc(listings.id))
    .limit(find.limit)
}

/** The ids of every listing but drafts that these owners have, with the owner of each. */
export function listIdsOfOwners(ex: Executor, ownerIds: string[]) {
  return ex
    .select({ id: listings.id, ownerUserId: listings.ownerUserId })
    .from(listings)
    .where(
      and(
        inArray(listings.ownerUserId, ownerIds),
        ne(listings.moderation, "draft")
      )
    )
}
