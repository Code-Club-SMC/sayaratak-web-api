import type { Taxonomy } from "@sayaratak/shared/schemas/taxonomy"

import type {
  CityRow,
  DistrictRow,
  MakeRow,
  ModelRow,
  PartCategoryRow,
  ServiceTemplateRow,
  SpecializationRow,
  VehicleTypeRow,
} from "./taxonomy.tables"

export type TaxonomyRows = {
  cities: CityRow[]
  districts: DistrictRow[]
  makes: MakeRow[]
  models: ModelRow[]
  vehicleTypes: VehicleTypeRow[]
  partCategories: PartCategoryRow[]
  specializations: SpecializationRow[]
  serviceTemplates: ServiceTemplateRow[]
}

export function toTaxonomy(rows: TaxonomyRows): Taxonomy {
  return {
    cities: rows.cities.map(({ id, slug, countryId, name, lat, lng }) => ({
      id,
      slug,
      countryId,
      name,
      center: { lat, lng },
    })),
    districts: rows.districts.map(({ id, cityId, name }) => ({
      id,
      cityId,
      name,
    })),
    // A make without an uploaded mark has no logoUrl key, as in the mock.
    makes: rows.makes.map(({ id, slug, name, logoUrl, vehicleTypes }) => ({
      id,
      slug,
      name,
      logoUrl: logoUrl ?? undefined,
      vehicleTypes,
    })),
    models: rows.models.map(({ id, makeId, name }) => ({ id, makeId, name })),
    vehicleTypes: rows.vehicleTypes.map(({ id, name, enabled }) => ({
      id,
      name,
      enabled,
    })),
    partCategories: rows.partCategories.map(({ id, slug, name }) => ({
      id,
      slug,
      name,
    })),
    specializations: rows.specializations.map(toNamed),
    serviceTemplates: rows.serviceTemplates.map(toNamed),
  }
}

function toNamed({ id, name }: SpecializationRow | ServiceTemplateRow) {
  return { id, name }
}
