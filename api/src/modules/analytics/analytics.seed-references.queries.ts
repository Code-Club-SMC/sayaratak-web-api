import { inArray } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { events, eventsMonthly } from "./analytics.tables"

export async function findAnalyticsEvents(
  tx: Transaction,
  targetIds: string[]
) {
  if (!targetIds.length) return []
  const daily = await tx
    .select({
      targetId: events.targetId,
      day: events.day,
      type: events.type,
    })
    .from(events)
    .where(inArray(events.targetId, targetIds))
    .limit(50)
  const monthly = await tx
    .select({
      targetId: eventsMonthly.targetId,
      month: eventsMonthly.month,
      type: eventsMonthly.type,
    })
    .from(eventsMonthly)
    .where(inArray(eventsMonthly.targetId, targetIds))
    .limit(50)
  return [...daily, ...monthly]
}
