import { eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { cities } from "./taxonomy.tables"

export function hasCity(ex: Executor, id: string) {
  return ex
    .select({ id: cities.id })
    .from(cities)
    .where(eq(cities.id, id))
    .limit(1)
    .then((rows) => rows.length > 0)
}
