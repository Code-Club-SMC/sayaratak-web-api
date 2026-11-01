import { eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import {
  dealerships,
  mechanicCities,
  mechanics,
  mechanicSpecializations,
  workshopServices,
  workshops,
} from "./businesses.tables"

export type NewDealershipRow = typeof dealerships.$inferInsert
export type NewWorkshopRow = typeof workshops.$inferInsert
export type NewMechanicRow = typeof mechanics.$inferInsert

const SLUG_TABLES = {
  dealership: dealerships,
  workshop: workshops,
  mechanic: mechanics,
}

/** Whether a profile of this kind already has the slug (slugs are unique per kind). */
export function hasSlug(
  ex: Executor,
  find: { kind: keyof typeof SLUG_TABLES; slug: string }
) {
  const table = SLUG_TABLES[find.kind]
  return ex
    .select({ id: table.id })
    .from(table)
    .where(eq(table.slug, find.slug))
    .limit(1)
    .then((rows) => rows.length > 0)
}

export function insertDealership(ex: Executor, row: NewDealershipRow) {
  return ex.insert(dealerships).values(row)
}

export function insertWorkshop(ex: Executor, row: NewWorkshopRow) {
  return ex.insert(workshops).values(row)
}

export function insertMechanic(ex: Executor, row: NewMechanicRow) {
  return ex.insert(mechanics).values(row)
}

export function insertServices(
  ex: Executor,
  rows: (typeof workshopServices.$inferInsert)[]
) {
  if (rows.length === 0) return Promise.resolve([])
  return ex.insert(workshopServices).values(rows)
}

export function insertMechanicCities(
  ex: Executor,
  rows: (typeof mechanicCities.$inferInsert)[]
) {
  if (rows.length === 0) return Promise.resolve([])
  return ex.insert(mechanicCities).values(rows)
}

export function insertMechanicSpecializations(
  ex: Executor,
  rows: (typeof mechanicSpecializations.$inferInsert)[]
) {
  if (rows.length === 0) return Promise.resolve([])
  return ex.insert(mechanicSpecializations).values(rows)
}
