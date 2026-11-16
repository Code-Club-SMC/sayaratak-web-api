import type { SeedListingBatch } from "@sayaratak/shared/schemas/seed-batches"
import { makeListingSlug } from "@sayaratak/shared/lib/slug"
import { extraDefaults } from "@sayaratak/shared/schemas/listing-fields"

import type { NewListingRow } from "./listings.tables"

type SeedRecordItem = SeedListingBatch["records"][number]
type VehicleRecord = Extract<SeedRecordItem, { kind: "vehicle" }>

function vehicleFields(vehicle: VehicleRecord | null) {
  if (!vehicle) {
    return {
      intent: "sale" as const,
      vehicleType: null,
      rentPeriod: null,
      makeId: null,
      modelId: null,
      year: null,
      mileageKm: null,
      fuel: null,
      transmission: null,
      engineCc: null,
      color: null,
      payloadTons: null,
    }
  }
  return {
    intent: vehicle.intent,
    vehicleType: vehicle.vehicleType,
    rentPeriod: vehicle.rentPeriod,
    makeId: vehicle.makeId,
    modelId: vehicle.modelId,
    year: vehicle.year,
    mileageKm: vehicle.mileageKm,
    fuel: vehicle.fuel,
    transmission: vehicle.transmission,
    engineCc: vehicle.engineCc,
    color: vehicle.color.ar,
    payloadTons: vehicle.payloadTons,
  }
}

function partFields(record: SeedRecordItem) {
  if (record.kind !== "part")
    return { partCategoryId: null, compatibleTypes: [] }
  return {
    partCategoryId: record.partCategoryId,
    compatibleTypes: record.compatibleTypes,
  }
}

/** Maps manifest content without fabricated contact, promotions or statistics. */
export function toSeedListing(
  batch: SeedListingBatch,
  record: SeedRecordItem,
  expiresAt: Date
): NewListingRow {
  const v = vehicleFields(record.kind === "vehicle" ? record : null)
  const p = partFields(record)
  return {
    id: record.id,
    slug: makeListingSlug(record.name.ar, record.cityId, record.id),
    ownerUserId: record.ownerId,
    ownerType: "dealership",
    ownerName: record.name,
    kind: record.kind,
    ...v,
    ...p,
    title: record.name.ar,
    description: record.description,
    price: record.price,
    negotiable: false,
    condition: record.condition,
    details: extraDefaults,
    cityId: record.cityId,
    contact: { phone: null, whatsapp: null, showPhone: false, methods: [] },
    status: "available",
    moderation: "approved",
    searchText:
      `${record.name.ar} ${record.name.en} ${record.description.ar} ${record.description.en}`.toLowerCase(),
    seedDatasetId: batch.datasetId,
    seedHidden: false,
    createdAt: new Date(batch.anchor),
    updatedAt: new Date(batch.anchor),
    expiresAt,
  }
}
