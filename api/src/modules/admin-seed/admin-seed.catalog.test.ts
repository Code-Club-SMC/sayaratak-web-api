import { expect, test } from "bun:test"
import { seedManifestSchema } from "@sayaratak/shared/schemas/seed-manifest"

import { bootstrapData } from "../../../scripts/bootstrap-data"
import { buildSeedManifest } from "./admin-seed.catalog.service"

test("all catalog taxonomy references exist and match their vehicle types", () => {
  const taxonomy = bootstrapData.taxonomy
  const manifest = buildSeedManifest()
  const cities = new Set(taxonomy.cities.map((row) => row.id))
  const makes = new Map(taxonomy.makes.map((row) => [row.id, row]))
  const models = new Map(taxonomy.models.map((row) => [row.id, row]))
  for (const row of manifest.records) {
    expect(cities.has(row.cityId)).toBe(true)
    if (row.kind === "vehicle") {
      expect(makes.get(row.makeId)?.vehicleTypes).toContain(row.vehicleType)
      expect(models.get(row.modelId)?.makeId).toBe(row.makeId)
      expect(row.intent === "rent").toBe(row.group === "rentals")
    }
    if (row.kind === "part")
      expect(
        taxonomy.partCategories.some((part) => part.id === row.partCategoryId)
      ).toBe(true)
  }
})

test("mechanic skills exist in the supported taxonomy", () => {
  const taxonomy = bootstrapData.taxonomy
  for (const row of buildSeedManifest().records) {
    if (row.kind === "mechanic")
      for (const id of row.specializationIds)
        expect(taxonomy.specializations.some((skill) => skill.id === id)).toBe(
          true
        )
  }
})

test("workshop services exist in the supported taxonomy", () => {
  const taxonomy = bootstrapData.taxonomy
  for (const row of buildSeedManifest().records) {
    if (row.kind === "workshop")
      for (const id of row.serviceTemplateIds)
        expect(
          taxonomy.serviceTemplates.some((service) => service.id === id)
        ).toBe(true)
  }
})

test("manifest validation rejects identity collisions and broken image pairs", () => {
  const manifest = buildSeedManifest()
  const first = manifest.records[0]
  const second = manifest.records[1]
  if (!first || !second) throw new Error("the catalog has multiple records")
  second.id = first.id
  expect(seedManifestSchema.safeParse(manifest).success).toBe(false)
  const broken = buildSeedManifest()
  const image = broken.assets[1]
  if (!image) throw new Error("the catalog has a second image")
  image.referenceFilename = "wrong-record-1.jpg"
  expect(seedManifestSchema.safeParse(broken).success).toBe(false)
})
