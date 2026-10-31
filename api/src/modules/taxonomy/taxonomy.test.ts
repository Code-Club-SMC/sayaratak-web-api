import { beforeEach, describe, expect, test } from "bun:test"
import { asc, eq, sql } from "drizzle-orm"

import { db } from "~/shared/db/client"

import { buildSeed, resetDb } from "../../../tests/helpers"
import { cities, countries, makes, models } from "./taxonomy.tables"

const seeded = buildSeed()

beforeEach(resetDb)

describe("taxonomy tables", () => {
  test("hold the mock's rows in the mock's order", async () => {
    const rows = await db.select().from(models).orderBy(asc(models.position))
    expect(rows.map(({ position: _, ...row }) => row)).toEqual(
      seeded.taxonomy.models
    )
    const countryRows = await db
      .select({ id: countries.id })
      .from(countries)
      .orderBy(asc(countries.position))
    expect(countryRows.map((row) => row.id)).toEqual(
      seeded.countries.map((country) => country.id)
    )
  })

  test("store names and settings as jsonb objects, not JSON strings", async () => {
    const rows = await db.execute<{ kinds: string[] }>(
      sql`select array(select distinct jsonb_typeof(name) from countries union select jsonb_typeof(contact) from settings) as kinds`
    )
    expect(rows[0]?.kinds).toEqual(["object"])
  })

  test("refuse to delete a city that districts still use", async () => {
    const error = await db
      .delete(cities)
      .where(eq(cities.id, "khartoum"))
      .catch((error) => error)
    expect(error.cause.errno).toBe("23503")
  })

  test("refuse a name without both languages and a make without types", async () => {
    const bad = { id: "x", slug: "x", vehicleTypes: [] }
    const noTypes = await db
      .insert(makes)
      .values({ ...bad, name: { ar: "x", en: "x" } })
      .catch((error) => error)
    expect(noTypes.cause.constraint).toBe("makes_vehicle_types")
    const oneSlot = await db
      .execute(
        sql`insert into makes (id, slug, name, vehicle_types) values ('y', 'y', '{"ar": "x"}', '{car}')`
      )
      .catch((error) => error)
    expect(oneSlot.cause.constraint).toBe("makes_name")
  })
})
