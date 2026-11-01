import { asc, desc, ilike, or, sql } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { byIdNumber } from "./businesses.queries"
import { dealerships, mechanics, workshops } from "./businesses.tables"

const TABLES = {
  dealership: dealerships,
  workshop: workshops,
  mechanic: mechanics,
}

type Kind = keyof typeof TABLES

export function count(ex: Executor, kind: Kind) {
  return ex.$count(TABLES[kind])
}

/** The newest profiles of one kind, ties in the mock's id order. */
export function listNewest(ex: Executor, find: { kind: Kind; limit: number }) {
  const table = TABLES[find.kind]
  return ex
    .select({ id: table.id, name: table.name, createdAt: table.createdAt })
    .from(table)
    .orderBy(desc(table.createdAt), ...byIdNumber(table), asc(table.id))
    .limit(find.limit)
}

/** Profiles of one kind whose name, in either language, holds the pattern. */
export function search(
  ex: Executor,
  find: { kind: Kind; pattern: string; limit: number }
) {
  const table = TABLES[find.kind]
  return ex
    .select({ id: table.id, name: table.name })
    .from(table)
    .where(
      or(
        // Raw SQL: Drizzle has no `->>`; the bilingual name is jsonb `{ ar, en }`.
        ilike(sql`${table.name} ->> 'ar'`, find.pattern),
        ilike(sql`${table.name} ->> 'en'`, find.pattern)
      )
    )
    .orderBy(...byIdNumber(table))
    .limit(find.limit)
}
