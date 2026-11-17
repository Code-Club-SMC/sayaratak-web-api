// @vitest-environment node
import { describe, expect, it } from "vitest"

import {
  seedArchiveInputSchema,
  seedArchiveRejectionSchema,
  seedCapabilitySchema,
  seedDatasetSummarySchema,
  seedDigestSchema,
  seedInputSchema,
  seedOperationSchema,
  seedPrepareInputSchema,
  seedProgressSchema,
  seedRemovalInputSchema,
  seedRetryInputSchema,
  seedStatusSchema,
} from "@sayaratak/shared/schemas/admin-seed"
import {
  seedAssetBindingSchema,
  seedBusinessBatchSchema,
  seedListingBatchSchema,
  seedOwnerBatchSchema,
} from "@sayaratak/shared/schemas/seed-batches"
import {
  seedAssetSchema,
  seedBusinessSchema,
  seedManifestSchema,
  seedOwnerSchema,
  seedPartSchema,
  seedPromptPackSchema,
  seedRecordSchema,
  seedVehicleSchema,
} from "@sayaratak/shared/schemas/seed-manifest"

// Boundary checks for the admin seed contracts; the API suite covers the full catalog.
const digest = "a".repeat(64)
const at = "2026-11-17T00:00:00.000Z"
const words = { ar: "نص", en: "Text" }
const identity = {
  ownerId: "o1",
  name: words,
  description: words,
  cityId: "khartoum",
}
const owner = { id: "o1", role: "dealership", name: words, cityId: "khartoum" }
const vehicle = {
  ...identity,
  id: "l00001",
  price: 5_000_000,
  condition: "used",
  kind: "vehicle",
  group: "cars",
  intent: "sale",
  vehicleType: "car",
  makeId: "toyota",
  modelId: "corolla",
  year: 2018,
  mileageKm: 90_000,
  fuel: "petrol",
  transmission: "automatic",
  engineCc: 1600,
  payloadTons: null,
  color: words,
  rentPeriod: null,
}
const part = {
  ...identity,
  id: "l00002",
  price: 20_000,
  condition: "new",
  kind: "part",
  group: "parts",
  partCategoryId: "brakes",
  compatibleTypes: ["car"],
  visualDescription: "Brake pads",
}
const business = {
  ...identity,
  id: "b1",
  ownerId: "o2",
  kind: "workshop",
  specializationIds: [],
  serviceTemplateIds: [],
  yearsOfExperience: 10,
}
const asset = {
  id: "a1",
  recordId: "l00001",
  position: 0,
  filename: "car-front.jpg",
  allowedFilenames: ["a", "b", "c"],
  referenceFilename: null,
  width: 1600,
  height: 1200,
  prompt: "x".repeat(200),
}
const binding = {
  assetId: "a1",
  recordId: "l00001",
  position: 0,
  generation: 1,
  uploadId: "u1",
  providerId: "p1",
  inputDigest: digest,
}
const batch = { datasetId: "d1", manifestDigest: digest, anchor: at }
const progress = { stage: "upload", completed: 1, total: 2, percent: 50 }
const operation = {
  id: "op1",
  kind: "seed",
  state: "running",
  progress,
  committedImages: 0,
  committedBusinesses: 0,
  committedListings: 0,
  retainedRecords: 0,
  error: null,
  createdAt: at,
  updatedAt: at,
}
const capability = { enabled: false, missing: ["R2_BUCKET"] }
const dataset = {
  id: "d1",
  version: "sudan-marketplace-v1",
  manifestDigest: digest,
  state: "ready",
  createdAt: at,
}

describe("seed manifest records", () => {
  it("accepts each record kind and rejects a malformed listing id", () => {
    expect(seedVehicleSchema.safeParse(vehicle).success).toBe(true)
    expect(seedPartSchema.safeParse(part).success).toBe(true)
    expect(seedBusinessSchema.safeParse(business).success).toBe(true)
    expect(seedOwnerSchema.safeParse(owner).success).toBe(true)
    expect(seedAssetSchema.safeParse(asset).success).toBe(true)
    for (const record of [vehicle, part, business])
      expect(seedRecordSchema.safeParse(record).success).toBe(true)
    expect(seedVehicleSchema.safeParse({ ...vehicle, id: "x1" }).success).toBe(
      false
    )
    expect(seedAssetSchema.safeParse({ ...asset, width: 800 }).success).toBe(
      false
    )
  })
  it("requires the full catalog counts", () => {
    const small = {
      version: "sudan-marketplace-v1",
      owners: [owner],
      records: [vehicle],
      assets: [asset],
    }
    expect(seedManifestSchema.safeParse(small).success).toBe(false)
    expect(
      seedPromptPackSchema.safeParse({ ...small, instructions: [] }).success
    ).toBe(false)
  })
})

describe("seed batches", () => {
  it("accepts bounded batches and rejects stray fields", () => {
    expect(seedAssetBindingSchema.safeParse(binding).success).toBe(true)
    expect(
      seedOwnerBatchSchema.safeParse({ ...batch, owners: [owner] }).success
    ).toBe(true)
    expect(
      seedBusinessBatchSchema.safeParse({
        ...batch,
        records: [business],
        bindings: [binding],
      }).success
    ).toBe(true)
    expect(
      seedListingBatchSchema.safeParse({
        ...batch,
        records: [vehicle, part],
        bindings: [],
      }).success
    ).toBe(true)
    expect(
      seedOwnerBatchSchema.safeParse({ ...batch, owners: [], extra: 1 }).success
    ).toBe(false)
  })
})

describe("admin seed API contracts", () => {
  it("validates digests, inputs and confirmations", () => {
    expect(seedDigestSchema.safeParse(digest).success).toBe(true)
    expect(seedDigestSchema.safeParse("abc").success).toBe(false)
    expect(seedPrepareInputSchema.safeParse({}).success).toBe(true)
    expect(seedPrepareInputSchema.safeParse({ a: 1 }).success).toBe(false)
    expect(
      seedArchiveInputSchema.parse({
        archiveDigest: digest,
        manifestDigest: digest,
        archiveBytes: "1024",
      }).replaceGenerations
    ).toEqual([])
    expect(
      seedArchiveInputSchema.safeParse({
        archiveDigest: digest,
        manifestDigest: digest,
        archiveBytes: 1,
        replaceGenerations: "{bad",
      }).success
    ).toBe(false)
    expect(
      seedRetryInputSchema.safeParse({
        operationId: "op1",
        manifestDigest: digest,
      }).success
    ).toBe(true)
    expect(
      seedInputSchema.safeParse({ manifestDigest: digest, confirmation: false })
        .success
    ).toBe(false)
    expect(
      seedRemovalInputSchema.safeParse({
        datasetId: "d1",
        manifestDigest: digest,
        confirmation: true,
      }).success
    ).toBe(true)
  })
  it("validates status, progress and operations", () => {
    expect(
      seedArchiveRejectionSchema.safeParse({
        assetId: "a1",
        filename: "car-front.jpg",
        reason: "seed_image_invalid",
      }).success
    ).toBe(true)
    expect(seedCapabilitySchema.safeParse(capability).success).toBe(true)
    expect(seedDatasetSummarySchema.safeParse(dataset).success).toBe(true)
    expect(seedProgressSchema.safeParse(progress).success).toBe(true)
    expect(
      seedProgressSchema.safeParse({ ...progress, completed: 3 }).success
    ).toBe(false)
    expect(seedOperationSchema.safeParse(operation).success).toBe(true)
    expect(
      seedStatusSchema.safeParse({
        capability,
        catalog: {
          version: "sudan-marketplace-v1",
          manifestDigest: digest,
          listings: 200,
          businesses: 30,
          images: 460,
        },
        dataset,
        operation,
        assets: { accepted: 0, missing: 460, rejected: 0 },
      }).success
    ).toBe(true)
  })
})
