import { asc, eq } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import {
  cities,
  countries,
  districts,
  makes,
  models,
  partCategories,
  serviceTemplates,
  specializations,
  vehicleTypes,
} from "./taxonomy.tables"

export function hasCity(ex: Executor, id: string) {
  return ex
    .select({ id: cities.id })
    .from(cities)
    .where(eq(cities.id, id))
    .limit(1)
    .then((rows) => rows.length > 0)
}

/** Cities of enabled countries, in list order. */
export function listShownCities(ex: Executor) {
  return ex
    .select({ city: cities })
    .from(cities)
    .innerJoin(countries, eq(countries.id, cities.countryId))
    .where(eq(countries.enabled, true))
    .orderBy(asc(cities.position))
    .then((rows) => rows.map((row) => row.city))
}

/** Districts whose city belongs to an enabled country, in list order. */
export function listShownDistricts(ex: Executor) {
  return ex
    .select({ district: districts })
    .from(districts)
    .innerJoin(cities, eq(cities.id, districts.cityId))
    .innerJoin(countries, eq(countries.id, cities.countryId))
    .where(eq(countries.enabled, true))
    .orderBy(asc(districts.position))
    .then((rows) => rows.map((row) => row.district))
}

export function listMakes(ex: Executor) {
  return ex.select().from(makes).orderBy(asc(makes.position))
}

export function listModels(ex: Executor) {
  return ex.select().from(models).orderBy(asc(models.position))
}

export function listVehicleTypes(ex: Executor) {
  return ex.select().from(vehicleTypes).orderBy(asc(vehicleTypes.position))
}

export function listPartCategories(ex: Executor) {
  return ex.select().from(partCategories).orderBy(asc(partCategories.position))
}

export function listSpecializations(ex: Executor) {
  return ex
    .select()
    .from(specializations)
    .orderBy(asc(specializations.position))
}

export function listServiceTemplates(ex: Executor) {
  return ex
    .select()
    .from(serviceTemplates)
    .orderBy(asc(serviceTemplates.position))
}
