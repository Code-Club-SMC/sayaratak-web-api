import { db } from "~/shared/db/client"
import type { Executor } from "~/shared/db/tx"

import { toTaxonomy } from "./taxonomy.mapper"
import * as q from "./taxonomy.queries"

/** The city exists in the taxonomy. */
export function isCity(ex: Executor, id: string) {
  return q.hasCity(ex, id)
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
