import { deviceOf } from "@sayaratak/shared/lib/users-report"

import { db } from "~/shared/db/client"
import { BATCH_SIZE, drain } from "~/shared/jobs/batches"
import { log } from "~/shared/log/logger"
import { clock } from "~/shared/time/clock"
import { dayOf } from "~/shared/time/khartoum"

import * as q from "./analytics.active.queries"
import * as events from "./analytics.queries"

// Owner, step 11.7-r10: activity rows are kept 13 months (about 396 days), like the daily events.
const DAYS_KEPT = 396
const DAY_MS = 86_400_000

/**
 * Marks a signed-in account active today on its device (owner, step 11.7-r10).
 * ponytail: one insert per signed-in request, a no-op after the first of the
 * day; an in-memory seen-today set if it ever shows in the database load.
 * A failure is logged, never fails the request.
 */
export async function markActive(input: {
  userId: string
  platform: string | undefined
  userAgent: string | undefined
}) {
  try {
    await q.markActive(db, {
      day: dayOf(clock.now()),
      userId: input.userId,
      device: deviceOf(input.platform, input.userAgent),
    })
  } catch (error) {
    log.warn("activity_log_failed", { error: String(error) })
  }
}

/** Deletes activity rows older than 13 months (`prune`). Answers how many it deleted. */
export function pruneOldActivity(size = BATCH_SIZE) {
  const beforeDay = dayOf(new Date(clock.now().getTime() - DAYS_KEPT * DAY_MS))
  return drain(
    (limit) => q.deleteOldActivity(db, { beforeDay, size: limit }),
    size
  )
}

/** Activity rows of the days `first` to `last` (step 11.7-r10). */
export function listActivity(days: { first: string; last: string }) {
  return q.listActivity(db, days)
}

/** The first day with an activity row, or null. */
export function firstActivityDay() {
  return q.firstActivityDay(db)
}

/** First day each listing or business got a call or WhatsApp click since `sinceDay`. */
export function listFirstClickDays(sinceDay: string) {
  return events.listFirstClickDays(db, sinceDay)
}
