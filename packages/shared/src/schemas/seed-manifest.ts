import { z } from "zod"

import { bilingualSchema, requiredInt } from "./fields"
import { fuelSchema, transmissionSchema, vehicleTypeSchema } from "./listing"

const text = z.string().min(1)
const bilingual = bilingualSchema.extend({ ar: text, en: text })
const identity = {
  id: text,
  ownerId: text,
  name: bilingual,
  description: bilingual,
  cityId: text,
}
const listing = {
  ...identity,
  id: z.string().regex(/^l[0-9a-z]{5}$/, "validation.required"),
  price: requiredInt(1, 9_999_999_999),
  condition: z.enum(["new", "used"]),
}
export const seedVehicleSchema = z.strictObject({
  ...listing,
  kind: z.literal("vehicle"),
  group: z.enum(["cars", "trucks", "motorcycles", "tuk_tuks", "rentals"]),
  intent: z.enum(["sale", "rent"]),
  vehicleType: vehicleTypeSchema,
  makeId: text,
  modelId: text,
  year: requiredInt(1970, 2026),
  mileageKm: requiredInt(0, 2_000_000),
  fuel: fuelSchema,
  transmission: transmissionSchema,
  engineCc: requiredInt(50, 20_000).nullable(),
  payloadTons: z.number().positive().nullable(),
  color: bilingual,
  rentPeriod: z.enum(["day", "week", "month"]).nullable(),
})
export const seedPartSchema = z.strictObject({
  ...listing,
  kind: z.literal("part"),
  group: z.literal("parts"),
  partCategoryId: text,
  compatibleTypes: z.array(vehicleTypeSchema).min(1),
  visualDescription: text,
})
export const seedBusinessSchema = z.strictObject({
  ...identity,
  kind: z.enum(["dealership", "workshop", "mechanic"]),
  specializationIds: z.array(text),
  serviceTemplateIds: z.array(text),
  yearsOfExperience: requiredInt(0, 60),
})
export const seedRecordSchema = z.union([
  seedVehicleSchema,
  seedPartSchema,
  seedBusinessSchema,
])
export const seedOwnerSchema = z.strictObject({
  id: text,
  role: z.enum(["dealership", "workshop", "mechanic"]),
  name: bilingual,
  cityId: text,
})
export const seedAssetSchema = z.strictObject({
  id: text,
  recordId: text,
  position: requiredInt(0, 1),
  filename: z.string().regex(/^[a-z0-9-]+\.jpg$/, "validation.required"),
  allowedFilenames: z.array(text).length(3),
  referenceFilename: text.nullable(),
  width: z.literal(1600),
  height: z.literal(1200),
  prompt: z.string().min(200),
})
export const seedManifestSchema = z
  .strictObject({
    version: z.literal("sudan-marketplace-v1"),
    owners: z.array(seedOwnerSchema).length(30),
    records: z.array(seedRecordSchema).length(230),
    assets: z.array(seedAssetSchema).length(460),
  })
  .superRefine(checkManifestLinks)

export type SeedVehicle = z.infer<typeof seedVehicleSchema>
export const seedPromptPackSchema = seedManifestSchema.safeExtend({
  instructions: z.array(z.string()),
})
export type SeedPart = z.infer<typeof seedPartSchema>
export type SeedBusiness = z.infer<typeof seedBusinessSchema>
export type SeedRecord = z.infer<typeof seedRecordSchema>
export type SeedOwner = z.infer<typeof seedOwnerSchema>
export type SeedAsset = z.infer<typeof seedAssetSchema>
export type SeedManifest = z.infer<typeof seedManifestSchema>

function checkManifestLinks(
  manifest: {
    owners: SeedOwner[]
    records: SeedRecord[]
    assets: SeedAsset[]
  },
  context: z.RefinementCtx
) {
  const owners = new Map(manifest.owners.map((owner) => [owner.id, owner]))
  const records = new Map(manifest.records.map((record) => [record.id, record]))
  const assets = new Set(manifest.assets.map((asset) => asset.id))
  const filenames = new Set(manifest.assets.map((asset) => asset.filename))
  const byRecord = new Map<string, SeedAsset[]>()
  for (const asset of manifest.assets) {
    const images = byRecord.get(asset.recordId) ?? []
    images.push(asset)
    byRecord.set(asset.recordId, images)
  }
  const unique =
    owners.size === manifest.owners.length &&
    records.size === manifest.records.length &&
    assets.size === manifest.assets.length &&
    filenames.size === manifest.assets.length
  if (!unique)
    context.addIssue({ code: "custom", message: "validation.required" })
  for (const record of manifest.records) {
    const role =
      record.kind === "vehicle" || record.kind === "part"
        ? "dealership"
        : record.kind
    if (owners.get(record.ownerId)?.role !== role)
      context.addIssue({ code: "custom", message: "validation.required" })
    checkRecordAssets(byRecord.get(record.id) ?? [], context)
  }
  for (const asset of manifest.assets)
    if (!records.has(asset.recordId))
      context.addIssue({ code: "custom", message: "validation.required" })
}

function checkRecordAssets(images: SeedAsset[], context: z.RefinementCtx) {
  const first = images.find((image) => image.position === 0)
  const second = images.find((image) => image.position === 1)
  if (
    images.length !== 2 ||
    !first ||
    !second ||
    first.referenceFilename !== null ||
    second.referenceFilename !== first.filename
  )
    context.addIssue({ code: "custom", message: "validation.required" })
}
