import type { SeedBusinessBatch } from "@sayaratak/shared/schemas/seed-batches"
import type { SeedBusiness } from "@sayaratak/shared/schemas/seed-manifest"

import type { Transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import * as taxonomy from "~/modules/taxonomy/taxonomy.service"

import * as q from "./businesses.seed.queries"
import * as write from "./businesses.write.queries"

export async function insertMechanic(
  tx: Transaction,
  input: {
    batch: SeedBusinessBatch
    record: SeedBusiness
    base: Omit<write.NewMechanicRow, "bio" | "yearsOfExperience" | "phone">
    first: string
    second: string
  }
) {
  const { record, base, first, second } = input
  const skills = await taxonomy.keepSpecializations(
    tx,
    record.specializationIds
  )
  if (skills.length !== record.specializationIds.length) fail.conflict()
  await write.insertMechanic(tx, {
    ...base,
    bio: record.description,
    yearsOfExperience: record.yearsOfExperience,
    phone: "",
    photoUploadId: first,
  })
  await write.insertMechanicCities(tx, [
    { mechanicId: record.id, cityId: record.cityId, position: 0 },
  ])
  await write.insertMechanicSpecializations(
    tx,
    skills.map((specializationId, position) => ({
      mechanicId: record.id,
      specializationId,
      position,
    }))
  )
  await q.insertSeedPortfolio(tx, {
    id: `${record.id}-portfolio`,
    mechanicId: record.id,
    uploadId: second,
    caption: record.description.ar,
    position: 0,
  })
}

export async function insertWorkshop(
  tx: Transaction,
  input: {
    record: SeedBusiness
    base: write.NewWorkshopRow
  }
) {
  const taxonomyRows = await taxonomy.getTaxonomy(tx)
  const templates = new Map(
    taxonomyRows.serviceTemplates.map((row) => [row.id, row])
  )
  const services = input.record.serviceTemplateIds.map((id, position) => {
    const template = templates.get(id)
    if (!template) fail.conflict()
    return {
      id: `${input.record.id}-service-${position}`,
      workshopId: input.record.id,
      name: template.name.ar,
      description: template.name.en,
      templateId: id,
      priceFrom: null,
      position,
    }
  })
  await write.insertWorkshop(tx, input.base)
  await write.insertServices(tx, services)
}
