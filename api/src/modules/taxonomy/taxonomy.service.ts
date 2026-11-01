import { db } from "~/shared/db/client"
import { type ErrorFields, fail } from "~/shared/http/errors"
import type { Executor } from "~/shared/db/tx"

import { toTaxonomy } from "./taxonomy.mapper"
import * as q from "./taxonomy.queries"

/** The city exists in the taxonomy. */
export function isCity(ex: Executor, id: string) {
  return q.hasCity(ex, id)
}

/** Each city's center point, keyed by city id. */
export async function getCityCenters(ex: Executor) {
  const rows = await q.listCityCenters(ex)
  return new Map(rows.map((row) => [row.id, { lat: row.lat, lng: row.lng }]))
}

/** Every public list the site builds its menus and filters from. Cities of a turned-off country, and their districts, stay off. */
export async function getTaxonomy() {
  // Eight small independent reads, run together.
  const [
    cities,
    districts,
    makes,
    models,
    vehicleTypes,
    partCategories,
    specializations,
    serviceTemplates,
  ] = await Promise.all([
    q.listShownCities(db),
    q.listShownDistricts(db),
    q.listMakes(db),
    q.listModels(db),
    q.listVehicleTypes(db),
    q.listPartCategories(db),
    q.listSpecializations(db),
    q.listServiceTemplates(db),
  ])
  return toTaxonomy({
    cities,
    districts,
    makes,
    models,
    vehicleTypes,
    partCategories,
    specializations,
    serviceTemplates,
  })
}

// In the order checkPicks runs its lookups.
const PICK_FIELDS = [
  "cityId",
  "districtId",
  "makeId",
  "modelId",
  "partCategoryId",
] as const

type Picks = {
  cityId: string
  districtId: string | null
  makeId: string | null
  modelId: string | null
  partCategoryId: string | null
}

/**
 * 422 `validation` unless every chosen list entry exists: the city, a district
 * of that city, the make, a model of that make, the part category. The mock
 * checks only the city; the rest would otherwise fail on a foreign key.
 */
export async function checkPicks(ex: Executor, picks: Picks) {
  const { cityId, districtId, makeId, modelId, partCategoryId } = picks
  // Independent lookups, run together. An empty pick passes.
  const checks = await Promise.all([
    q.hasCity(ex, cityId),
    !districtId || q.hasDistrictIn(ex, { cityId, districtId }),
    !makeId || q.hasMake(ex, makeId),
    !modelId || (makeId !== null && q.hasModelOf(ex, { makeId, modelId })),
    !partCategoryId || q.hasPartCategory(ex, partCategoryId),
  ])
  const fields: ErrorFields = {}
  PICK_FIELDS.forEach((field, i) => {
    if (!checks[i]) fields[field] = "validation.required"
  })
  if (Object.keys(fields).length > 0) fail.validation(fields)
}

/** "<ar> <en>" of each make or model id, for the listing search text. */
export async function getNames(ex: Executor, ids: (string | null)[]) {
  const rows = await q.listMakeAndModelNames(
    ex,
    ids.filter((id): id is string => Boolean(id))
  )
  return new Map(rows.map((row) => [row.id, `${row.name.ar} ${row.name.en}`]))
}
