import { z } from "zod"

import {
  seedBusinessSchema,
  seedOwnerSchema,
  seedPartSchema,
  seedVehicleSchema,
} from "./seed-manifest"

const batch = {
  datasetId: z.string().min(1),
  manifestDigest: z.string().regex(/^[a-f0-9]{64}$/),
  anchor: z.iso.datetime(),
}

// The orchestrator supplies the exact accepted generation, never an arbitrary upload.
export const seedAssetBindingSchema = z.strictObject({
  assetId: z.string().min(1),
  recordId: z.string().min(1),
  position: z.number().int().min(0).max(1),
  generation: z.number().int().positive(),
  uploadId: z.string().min(1),
  providerId: z.string().min(1),
  inputDigest: z.string().regex(/^[a-f0-9]{64}$/),
})

export const seedOwnerBatchSchema = z.strictObject({
  ...batch,
  owners: z.array(seedOwnerSchema).max(30),
})
export const seedBusinessBatchSchema = z.strictObject({
  ...batch,
  records: z.array(seedBusinessSchema).max(25),
  bindings: z.array(seedAssetBindingSchema).max(50),
})
export const seedListingBatchSchema = z.strictObject({
  ...batch,
  records: z.array(z.union([seedVehicleSchema, seedPartSchema])).max(25),
  bindings: z.array(seedAssetBindingSchema).max(50),
})

export type SeedAssetBinding = z.infer<typeof seedAssetBindingSchema>
export type SeedOwnerBatch = z.infer<typeof seedOwnerBatchSchema>
export type SeedBusinessBatch = z.infer<typeof seedBusinessBatchSchema>
export type SeedListingBatch = z.infer<typeof seedListingBatchSchema>
