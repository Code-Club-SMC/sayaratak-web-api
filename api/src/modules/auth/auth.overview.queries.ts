import { asc, count, eq, ilike, or, sql } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"
import { type DayRange, dayColumn, withinDays } from "~/shared/time/khartoum"

import { user } from "./auth.tables"

export function countUsers(ex: Executor) {
  return ex.$count(user)
}

/** New accounts per Khartoum day inside `days`; days with none are missing. */
export function listCreatedPerDay(ex: Executor, days: DayRange) {
  const day = dayColumn(user.createdAt)
  return ex
    .select({ day, count: count() })
    .from(user)
    .where(withinDays(user.createdAt, days))
    .groupBy(day)
}

/** Accounts whose name, phone or email holds the pattern, in the mock's id order (`u-1`, `u-2`, `u-10`). */
export function search(ex: Executor, find: { pattern: string; limit: number }) {
  return ex
    .select({
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
    })
    .from(user)
    .where(
      or(
        ilike(user.name, find.pattern),
        ilike(user.phone, find.pattern),
        ilike(user.email, find.pattern)
      )
    )
    .orderBy(asc(sql`length(${user.id})`), asc(user.id))
    .limit(find.limit)
}

/** An account lists the city as its own. */
export function hasUserInCity(ex: Executor, cityId: string) {
  return ex
    .select({ id: user.id })
    .from(user)
    .where(eq(user.cityId, cityId))
    .limit(1)
    .then((rows) => rows.length > 0)
}
