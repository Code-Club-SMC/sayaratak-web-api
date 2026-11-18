import type { SearchLogKey } from "@sayaratak/shared/search/log"

import { db } from "~/shared/db/client"
import { BATCH_SIZE, drain } from "~/shared/jobs/batches"
import { log } from "~/shared/log/logger"
import { clock } from "~/shared/time/clock"
import { dayOf } from "~/shared/time/khartoum"
import * as taxonomy from "~/modules/taxonomy/taxonomy.service"

import * as q from "./analytics.search.queries"

// Owner, step 11.7-r4: search rows are kept 13 months (about 396 days), like the daily events.
const DAYS_KEPT = 396
const DAY_MS = 86_400_000

/**
 * Counts one public search in today's row for its filter set (owner, step
 * 11.7-r4). Ids that name nothing are not counted, so a stranger cannot grow
 * the table with made-up ids. A failure is logged, never fails the search.
 */
export async function recordSearch(key: SearchLogKey, total: number) {
  try {
    if (!(await taxonomy.knowsFilters(db, key))) return
    await q.bumpSearch(db, { ...key, day: dayOf(clock.now()), total })
  } catch (error) {
    log.warn("search_log_failed", { error: String(error) })
  }
}

/** Deletes search rows older than 13 months (`prune`). Answers how many it deleted. */
export function pruneOldSearches(size = BATCH_SIZE) {
  const beforeDay = dayOf(new Date(clock.now().getTime() - DAYS_KEPT * DAY_MS))
  return drain(
    (limit) => q.deleteOldSearches(db, { beforeDay, size: limit }),
    size
  )
}
