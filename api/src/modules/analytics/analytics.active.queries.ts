import type { Device } from "@sayaratak/shared/schemas/reports-insights"
import { and, gte, lte, min, sql } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { userActivity as a } from "./analytics.tables"

/** Marks the account active on the day with the device; a repeat is a no-op. */
export function markActive(
  ex: Executor,
  row: { day: string; userId: string; device: Device }
) {
  return ex.insert(a).values(row).onConflictDoNothing()
}

/** Activity rows of the days `first` to `last`, both included. */
export function listActivity(
  ex: Executor,
  days: { first: string; last: string }
) {
  return ex
    .select({ day: a.day, userId: a.userId, device: a.device })
    .from(a)
    .where(and(gte(a.day, days.first), lte(a.day, days.last)))
}

/** The first day with an activity row, or null. */
export async function firstActivityDay(ex: Executor) {
  const [row] = await ex.select({ day: min(a.day) }).from(a)
  return row?.day ?? null
}

/** Deletes one batch of activity rows before the day. Answers how many. */
export async function deleteOldActivity(
  ex: Executor,
  batch: { beforeDay: string; size: number }
) {
  const rows = await ex.execute(
    sql`delete from ${a} where ctid in (select ctid from ${a} where ${a.day} < ${batch.beforeDay} limit ${batch.size} for update skip locked) returning day`
  )
  return rows.length
}
