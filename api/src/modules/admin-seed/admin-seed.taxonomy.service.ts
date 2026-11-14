import type {
  SeedManifest,
  SeedRecord,
  SeedVehicle,
} from "@sayaratak/shared/schemas/seed-manifest"

import { fail } from "~/shared/http/errors"
import type { Executor } from "~/shared/db/tx"
import { getTaxonomy } from "~/modules/taxonomy/taxonomy.service"

/** Refuses stale/deleted taxonomy references rather than silently substituting different vehicles. */
export async function checkSeedTaxonomy(ex: Executor, manifest: SeedManifest) {
  const taxonomy = await getTaxonomy(ex)
  const known = references(taxonomy)
  for (const record of manifest.records) checkRecord(record, known)
}

function references(taxonomy: Awaited<ReturnType<typeof getTaxonomy>>) {
  return {
    cities: new Set(taxonomy.cities.map((row) => row.id)),
    makes: new Map(taxonomy.makes.map((row) => [row.id, row])),
    models: new Map(taxonomy.models.map((row) => [row.id, row.makeId])),
    categories: new Set(taxonomy.partCategories.map((row) => row.id)),
    skills: new Set(taxonomy.specializations.map((row) => row.id)),
    services: new Set(taxonomy.serviceTemplates.map((row) => row.id)),
  }
}

function checkRecord(record: SeedRecord, known: ReturnType<typeof references>) {
  if (!known.cities.has(record.cityId)) fail.conflict()
  if (record.kind === "vehicle") checkVehicle(record, known)
  if (record.kind === "part" && !known.categories.has(record.partCategoryId))
    fail.conflict()
  if (
    record.kind === "mechanic" &&
    record.specializationIds.some((id) => !known.skills.has(id))
  )
    fail.conflict()
  if (
    record.kind === "workshop" &&
    record.serviceTemplateIds.some((id) => !known.services.has(id))
  )
    fail.conflict()
}

function checkVehicle(
  record: SeedVehicle,
  known: ReturnType<typeof references>
) {
  if (
    !known.makes.get(record.makeId)?.vehicleTypes.includes(record.vehicleType)
  )
    fail.conflict()
  if (known.models.get(record.modelId) !== record.makeId) fail.conflict()
}
