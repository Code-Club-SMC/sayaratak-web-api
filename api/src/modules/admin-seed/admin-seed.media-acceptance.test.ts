import { afterEach, beforeEach, expect, test } from "bun:test"
import { and, eq } from "drizzle-orm"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import {
  seedImageKey,
  storeSeedImage,
} from "~/modules/uploads/uploads.seed.service"
import { fileDeletions } from "~/modules/uploads/uploads.tables"

import { adminCaller } from "../../../tests/admin"
import { resetDb } from "../../../tests/helpers"
import { acceptSeedArchive } from "./admin-seed.accept.service"
import { seedAssets, seedStorageIntents } from "./admin-seed.assets.tables"
import {
  seedDatasets,
  seedOperations,
  type SeedDatasetRow,
} from "./admin-seed.tables"

const original = { enabled: env.ADMIN_SEED_ENABLED, appEnv: env.APP_ENV }
beforeEach(async () => {
  env.ADMIN_SEED_ENABLED = true
  env.APP_ENV = "test"
  await resetDb()
})
afterEach(() => {
  env.ADMIN_SEED_ENABLED = original.enabled
  env.APP_ENV = original.appEnv
})

async function imageGeneration(dataset: SeedDatasetRow, generation: number) {
  const asset = dataset.manifest.assets[0]
  if (!asset) throw new Error("manifest asset missing")
  const bytes = Uint8Array.from([generation])
  const digest = new Bun.CryptoHasher("sha256").update(bytes).digest("hex")
  const input = {
    datasetId: dataset.id,
    operationId: `operation-${generation}`,
    assetId: asset.id,
    generation,
    inputDigest: digest,
    normalizedDigest: digest,
    bytes,
    mime: "image/jpeg",
    width: 1600,
    height: 1200,
  } satisfies Parameters<typeof seedImageKey>[0]
  const immutableKey = seedImageKey(input)
  const stored = await storeSeedImage({ ...input, immutableKey })
  await db.insert(seedOperations).values({
    id: input.operationId,
    datasetId: dataset.id,
    kind: "archive",
    state: generation === 2 ? "completed" : "queued",
    stage: generation === 2 ? "complete" : "store-images",
    activeSlot: generation === 2 ? null : true,
    completed: generation === 2 ? 1 : 0,
    total: 1,
    actorIp: "127.0.0.1",
    createdAt: clock.now(),
    updatedAt: clock.now(),
  })
  await db.insert(seedAssets).values({
    datasetId: dataset.id,
    assetId: asset.id,
    generation,
    operationId: input.operationId,
    filename: asset.filename,
    state: "stored",
    accepted: generation === 2,
    inputDigest: digest,
    bytes: bytes.length,
    width: input.width,
    height: input.height,
    mime: input.mime,
    uploadId: stored.uploadId,
    providerId: immutableKey,
    createdAt: clock.now(),
  })
  await db.insert(seedStorageIntents).values({
    id: `intent-${generation}`,
    datasetId: dataset.id,
    operationId: input.operationId,
    assetId: asset.id,
    generation,
    provider: "cloudinary",
    objectKey: immutableKey,
    digest,
    purpose: "image",
    state: "stored",
    createdAt: clock.now(),
  })
  const entry = {
    assetId: asset.id,
    filename: asset.filename,
    generation,
    digest,
    bytes: bytes.length,
    width: input.width,
    height: input.height,
    mime: input.mime,
  }
  return { input, stored, entry }
}

async function acceptanceFixture() {
  expect((await adminCaller()("POST", "/admin/seed/prepare", {})).status).toBe(
    200
  )
  const [dataset] = await db.select().from(seedDatasets)
  if (!dataset) throw new Error("dataset missing")
  const previous = await imageGeneration(dataset, 2)
  const next = await imageGeneration(dataset, 3)
  const checkpoint = {
    archiveKey: `admin-seed/${dataset.id}/operation-3/${next.entry.digest}.zip`,
    archiveDigest: next.entry.digest,
    archiveBytes: 1,
    entries: [next.entry],
    replaceGenerations: [],
  }
  await db
    .update(seedOperations)
    .set({ checkpoint })
    .where(eq(seedOperations.id, next.input.operationId))
  return { dataset, previous, next, checkpoint }
}

test("a replacement cannot change accepted generations without exact confirmation", async () => {
  const fixture = await acceptanceFixture()
  await expect(
    acceptSeedArchive(fixture.next.input.operationId)
  ).rejects.toThrow()
  const accepted = await db
    .select()
    .from(seedAssets)
    .where(eq(seedAssets.accepted, true))
  expect(accepted).toHaveLength(1)
  expect(accepted[0]?.generation).toBe(2)
  expect(await db.select().from(fileDeletions)).toHaveLength(0)
  await db
    .update(seedOperations)
    .set({
      checkpoint: {
        ...fixture.checkpoint,
        replaceGenerations: [
          {
            assetId: fixture.previous.entry.assetId,
            generation: 2,
          },
        ],
      },
    })
    .where(eq(seedOperations.id, fixture.next.input.operationId))
  await acceptSeedArchive(fixture.next.input.operationId)
  const replacement = await db
    .select()
    .from(seedAssets)
    .where(
      and(
        eq(seedAssets.datasetId, fixture.dataset.id),
        eq(seedAssets.accepted, true)
      )
    )
  expect(replacement).toHaveLength(1)
  expect(replacement[0]?.generation).toBe(3)
  expect(await db.select().from(fileDeletions)).toHaveLength(1)
  await acceptSeedArchive(fixture.next.input.operationId)
  expect(await db.select().from(fileDeletions)).toHaveLength(1)
})

test("a frozen dataset refuses an otherwise valid accepted-generation swap", async () => {
  const fixture = await acceptanceFixture()
  await db
    .update(seedDatasets)
    .set({ state: "seeding" })
    .where(eq(seedDatasets.id, fixture.dataset.id))
  await expect(
    acceptSeedArchive(fixture.next.input.operationId)
  ).rejects.toThrow()
  const accepted = await db
    .select()
    .from(seedAssets)
    .where(eq(seedAssets.accepted, true))
  expect(accepted[0]?.generation).toBe(2)
})
