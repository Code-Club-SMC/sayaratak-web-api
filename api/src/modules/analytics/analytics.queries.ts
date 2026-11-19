import type { EventType } from "@sayaratak/shared/schemas/api"
import { and, between, eq, inArray, min, sql, sum } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"
import type { DayRange } from "~/shared/time/khartoum"

import { events, eventsHourly, eventsMonthly } from "./analytics.tables"

// The counters of a listing or business page. Banner types are left out.
export const PAGE_TYPES = [
  "view",
  "phone_click",
  "whatsapp_click",
  "share",
] as const

/** Removes a target's counters: hourly, daily and the months they were rolled into. */
export async function deleteOfTarget(ex: Executor, targetId: string) {
  await ex.delete(eventsHourly).where(eq(eventsHourly.targetId, targetId))
  await ex.delete(events).where(eq(events.targetId, targetId))
  await ex.delete(eventsMonthly).where(eq(eventsMonthly.targetId, targetId))
}

/** Adds one to the counter of the target, day and type; the first one of a day creates the row. */
export function bumpEvent(
  ex: Executor,
  event: Pick<typeof events.$inferInsert, "day" | "targetId" | "type">
) {
  return ex
    .insert(events)
    .values({ ...event, count: 1 })
    .onConflictDoUpdate({
      target: [events.targetId, events.day, events.type],
      set: { count: sql`${events.count} + 1` },
    })
}

type EventTypes = readonly EventType[]

/** Page counters (or `types`) per day and type for these targets (`null`: all of them) inside the days. */
export function listDailyCounts(
  ex: Executor,
  targetIds: string[] | null,
  days: DayRange
) {
  return ex
    .select({
      day: events.day,
      type: events.type,
      count: sum(events.count).mapWith(Number),
    })
    .from(events)
    .where(pageEvents(targetIds, days))
    .groupBy(events.day, events.type)
}

/**
 * Rolled-up page counters per month and type for these targets (`null`: all),
 * for the months the days touch. Whole months: a month row holds every day of it.
 */
export function listMonthlyCounts(
  ex: Executor,
  targetIds: string[] | null,
  days: DayRange
) {
  return monthly(ex, { targetIds, days, types: PAGE_TYPES })
}

const BANNER_TYPES = ["banner_view", "banner_click"] as const

/** Banner views and clicks of one campaign per day and type inside the days. */
export function listDailyBannerCounts(
  ex: Executor,
  input: { targetId: string; days: DayRange }
) {
  return ex
    .select({
      day: events.day,
      type: events.type,
      count: sum(events.count).mapWith(Number),
    })
    .from(events)
    .where(pageEvents([input.targetId], input.days, BANNER_TYPES))
    .groupBy(events.day, events.type)
}

/** Rolled-up banner views and clicks of one campaign per month for the months the days touch. */
export function listMonthlyBannerCounts(
  ex: Executor,
  input: { targetId: string; days: DayRange }
) {
  return monthly(ex, {
    targetIds: [input.targetId],
    days: input.days,
    types: BANNER_TYPES,
  })
}

function monthly(
  ex: Executor,
  input: { targetIds: string[] | null; days: DayRange; types: EventTypes }
) {
  const { targetIds, days, types } = input
  return ex
    .select({
      month: eventsMonthly.month,
      type: eventsMonthly.type,
      count: sum(eventsMonthly.count).mapWith(Number),
    })
    .from(eventsMonthly)
    .where(
      and(
        between(eventsMonthly.month, `${days.first.slice(0, 7)}-01`, days.last),
        inArray(eventsMonthly.type, [...types]),
        targetIds ? inArray(eventsMonthly.targetId, targetIds) : undefined
      )
    )
    .groupBy(eventsMonthly.month, eventsMonthly.type)
}

/** Page counters per target and type for these targets inside the days. */
export function listTargetCounts(
  ex: Executor,
  targetIds: string[],
  days: DayRange
) {
  return ex
    .select({
      targetId: events.targetId,
      type: events.type,
      count: sum(events.count).mapWith(Number),
    })
    .from(events)
    .where(pageEvents(targetIds, days))
    .groupBy(events.targetId, events.type)
}

function pageEvents(
  targetIds: string[] | null,
  days: DayRange,
  types: EventTypes = PAGE_TYPES
) {
  return and(
    between(events.day, days.first, days.last),
    inArray(events.type, [...types]),
    targetIds ? inArray(events.targetId, targetIds) : undefined
  )
}

/** Rolled-up page counters per target and type for the months the days touch. */
export function listTargetMonthlyCounts(
  ex: Executor,
  targetIds: string[],
  days: DayRange
) {
  return ex
    .select({
      targetId: eventsMonthly.targetId,
      type: eventsMonthly.type,
      count: sum(eventsMonthly.count).mapWith(Number),
    })
    .from(eventsMonthly)
    .where(
      and(
        between(eventsMonthly.month, `${days.first.slice(0, 7)}-01`, days.last),
        inArray(eventsMonthly.type, [...PAGE_TYPES]),
        inArray(eventsMonthly.targetId, targetIds)
      )
    )
    .groupBy(eventsMonthly.targetId, eventsMonthly.type)
}

/** First day each target got a call or WhatsApp click since `sinceDay` (step 11.7-r10). */
export function listFirstClickDays(ex: Executor, sinceDay: string) {
  return ex
    .select({ targetId: events.targetId, day: min(events.day) })
    .from(events)
    .where(
      and(
        inArray(events.type, ["phone_click", "whatsapp_click"]),
        sql`${events.day} >= ${sinceDay}`
      )
    )
    .groupBy(events.targetId)
}
