import { sql } from "drizzle-orm"
import type { z } from "zod"

import { app } from "~/app"
import { db } from "~/shared/db/client"

import { seed } from "../scripts/seed"

/** A request to the api under `/api/v1`, through `app.request()` (no network). */
export function req(path: string, init?: RequestInit) {
  return app.request(`/api/v1${path}`, init)
}

/** Parses the response body with a shared web schema; a mismatch fails the test with Zod's issues. */
export async function expectSchema<S extends z.ZodType>(
  res: Response,
  schema: S
): Promise<z.output<S>> {
  return schema.parse(await res.json())
}

/** Empties every table and seeds it again, so each test starts from the mock's data. */
export async function resetDb() {
  const rows = await db.execute<{ name: string }>(
    sql`select tablename as name from pg_tables where schemaname = 'public'`
  )
  // Table names come from the catalog, quoted as identifiers, never from input.
  const tables = sql.join(
    rows.map((row) => sql.identifier(row.name)),
    sql`, `
  )
  await db.execute(sql`truncate ${tables} restart identity cascade`)
  await seed(db)
}
