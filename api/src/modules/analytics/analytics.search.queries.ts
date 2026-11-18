import type { SearchLogKey } from "@sayaratak/shared/search/log"
import { sql } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { searchesDaily as s } from "./analytics.tables"

/** Adds one search to the day's row of its filter set. */
export function bumpSearch(
  ex: Executor,
  row: SearchLogKey & { day: string; total: number }
) {
  const zero = row.total === 0 ? 1 : 0
  return ex.execute(sql`
    insert into ${s} (day, kind, intent, type, make, model, city, part_category, has_text, searches, zero_results, results)
    values (${row.day}, ${row.kind}, ${row.intent}, ${row.type}, ${row.make}, ${row.model}, ${row.city}, ${row.partCategory}, ${row.hasText}, 1, ${zero}, ${row.total})
    on conflict on constraint searches_daily_pk do update set
      searches = ${s.searches} + 1,
      zero_results = ${s.zeroResults} + excluded.zero_results,
      results = ${s.results} + excluded.results`)
}

/** Deletes one batch of search rows before the day. Answers how many. */
export async function deleteOldSearches(
  ex: Executor,
  batch: { beforeDay: string; size: number }
) {
  const rows = await ex.execute(
    sql`delete from ${s} where ctid in (select ctid from ${s} where ${s.day} < ${batch.beforeDay} limit ${batch.size} for update skip locked) returning day`
  )
  return rows.length
}
