import { z } from "zod"

import { requiredInt } from "./fields"

export const seedDigestSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, "validation.required")
export const seedDatasetStateSchema = z.enum([
  "preparing",
  "ready",
  "seeding",
  "installed",
  "removing",
  "removed",
  "retained",
])
export const seedOperationKindSchema = z.enum(["archive", "seed", "remove"])
export const seedOperationStateSchema = z.enum([
  "receiving",
  "queued",
  "running",
  "failed",
  "completed",
])
export const seedStageSchema = z.enum([
  "upload",
  "validate",
  "store-images",
  "insert-businesses",
  "insert-listings",
  "hide",
  "remove-records",
  "remove-media",
  "complete",
])
export const seedCapabilitySchema = z.object({
  enabled: z.boolean(),
  missing: z.array(
    z.enum([
      "ADMIN_SEED_ENABLED",
      "CLOUDINARY_URL",
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET",
      "TEST_ENVIRONMENT",
    ])
  ),
})
export const seedPrepareInputSchema = z.strictObject({})
export const seedDatasetSummarySchema = z.object({
  id: z.string().min(1),
  version: z.literal("sudan-marketplace-v1"),
  manifestDigest: seedDigestSchema,
  state: seedDatasetStateSchema,
  createdAt: z.iso.datetime(),
})
export const seedProgressSchema = z
  .object({
    stage: seedStageSchema,
    completed: requiredInt(0, Number.MAX_SAFE_INTEGER),
    total: requiredInt(0, Number.MAX_SAFE_INTEGER),
    percent: requiredInt(0, 100).nullable(),
  })
  .refine((value) => value.completed <= value.total, "validation.number")
export const seedOperationSchema = z.object({
  id: z.string().min(1),
  kind: seedOperationKindSchema,
  state: seedOperationStateSchema,
  progress: seedProgressSchema,
  committedImages: requiredInt(0, 460),
  committedBusinesses: requiredInt(0, 30),
  committedListings: requiredInt(0, 200),
  retainedRecords: requiredInt(0, 230),
  error: z
    .string()
    .regex(/^[a-z0-9_]+$/)
    .nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export const seedStatusSchema = z.object({
  capability: seedCapabilitySchema,
  catalog: z.object({
    version: z.literal("sudan-marketplace-v1"),
    manifestDigest: seedDigestSchema,
    listings: z.literal(200),
    businesses: z.literal(30),
    images: z.literal(460),
  }),
  dataset: seedDatasetSummarySchema.nullable(),
  operation: seedOperationSchema.nullable(),
  assets: z.object({
    accepted: requiredInt(0, 460),
    missing: requiredInt(0, 460),
    rejected: requiredInt(0, 460),
  }),
})
export type SeedCapability = z.infer<typeof seedCapabilitySchema>
export type SeedDatasetSummary = z.infer<typeof seedDatasetSummarySchema>
export type SeedOperation = z.infer<typeof seedOperationSchema>
export type SeedStatus = z.infer<typeof seedStatusSchema>
