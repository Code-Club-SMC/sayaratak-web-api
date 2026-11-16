import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import { eq } from "drizzle-orm"
import sharp from "sharp"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { checkSeedImage } from "~/shared/files/image-check"
import { files } from "~/shared/files/store"
import { seedArchiveKey, seedArchives } from "~/shared/storage/seed-archives"
import { clock } from "~/shared/time/clock"
import { uploads } from "~/modules/uploads/uploads.tables"

import { adminCaller } from "../../../tests/admin"
import { resetDb } from "../../../tests/helpers"
import { seedZipFixture } from "../../../tests/seed-zip-fixture"
import { seedAssets, seedStorageIntents } from "./admin-seed.assets.tables"
import { acceptSeedArchive, processSeedMedia } from "./admin-seed.media.service"
import { seedDatasets, seedOperations } from "./admin-seed.tables"
import { runSeedPass } from "./admin-seed.work.service"

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

async function stagedArchive(size: number) {
  expect((await adminCaller()("POST", "/admin/seed/prepare", {})).status).toBe(
    200
  )
  const [dataset] = await db.select().from(seedDatasets)
  if (!dataset) throw new Error("dataset missing")
  const bytes = new Uint8Array(
    await sharp({
      create: {
        width: 1600,
        height: 1200,
        channels: 3,
        background: "#777777",
      },
    })
      .jpeg()
      .toBuffer()
  )
  const checked = await checkSeedImage(bytes)
  const entries = dataset.manifest.assets.slice(0, size).map((asset) => {
    const filename = asset.allowedFilenames.find((name) =>
      name.endsWith(".jpg")
    )
    if (!filename) throw new Error("JPEG filename missing")
    return { assetId: asset.id, filename, generation: 2, ...checked }
  })
  const archive = seedZipFixture(
    entries.map((entry) => ({ filename: entry.filename, bytes }))
  )
  const digest = new Bun.CryptoHasher("sha256").update(archive).digest("hex")
  const id = "seed-media-operation"
  const archiveKey = seedArchiveKey({
    datasetId: dataset.id,
    operationId: id,
    digest,
  })
  await seedArchives.put(archiveKey, new Blob([archive]).stream())
  await db.insert(seedOperations).values({
    id,
    datasetId: dataset.id,
    kind: "archive",
    state: "queued",
    stage: "store-images",
    actorIp: "127.0.0.1",
    total: size,
    checkpoint: {
      archiveKey,
      archiveDigest: digest,
      archiveBytes: archive.length,
      replaceGenerations: [],
      entries,
    },
    createdAt: clock.now(),
    updatedAt: clock.now(),
  })
  return { id, dataset, archiveKey, entries }
}

test("lost provider acknowledgment retries one immutable key and accepts one generation", async () => {
  const fixture = await stagedArchive(1)
  const put = files.put.bind(files)
  const keys: string[] = []
  const lost = spyOn(files, "put").mockImplementationOnce(async (input) => {
    keys.push(input.immutableKey ?? "")
    await put(input)
    throw new Error("acknowledgment lost")
  })
  try {
    await expect(processSeedMedia(fixture.id)).rejects.toThrow(
      "acknowledgment lost"
    )
  } finally {
    lost.mockRestore()
  }
  const [intent] = await db.select().from(seedStorageIntents)
  expect(intent).toMatchObject({ objectKey: keys[0], state: "pending" })
  const retry = spyOn(files, "put").mockImplementation(async (input) => {
    keys.push(input.immutableKey ?? "")
    return put(input)
  })
  try {
    expect(await processSeedMedia(fixture.id)).toBe(1)
  } finally {
    retry.mockRestore()
  }
  expect(new Set(keys).size).toBe(1)
  const accepted = await db
    .select()
    .from(seedAssets)
    .where(eq(seedAssets.accepted, true))
  expect(accepted).toHaveLength(1)
  expect(accepted[0]).toMatchObject({
    providerId: keys[0],
    width: 1600,
    height: 1200,
  })
  const stored = await db
    .select()
    .from(uploads)
    .where(eq(uploads.seedDatasetId, fixture.dataset.id))
  expect(stored).toHaveLength(1)
  expect(stored[0]).toMatchObject({ width: 1200, height: 800 })
  await acceptSeedArchive(fixture.id)
  expect(await processSeedMedia(fixture.id)).toBe(0)
})

test("stores at most five images and never accepts a partial archive", async () => {
  const fixture = await stagedArchive(6)
  expect(await processSeedMedia(fixture.id)).toBe(5)
  expect(
    await db.select().from(seedAssets).where(eq(seedAssets.accepted, true))
  ).toHaveLength(0)
  const [operation] = await db
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, fixture.id))
  expect(operation).toMatchObject({
    completed: 5,
    total: 6,
    committedImages: 0,
    state: "running",
  })
  expect(await processSeedMedia(fixture.id)).toBe(1)
  expect(
    await db.select().from(seedAssets).where(eq(seedAssets.accepted, true))
  ).toHaveLength(6)
})

test("a wrong provider identity cannot become an accepted seed image", async () => {
  const fixture = await stagedArchive(1)
  const put = spyOn(files, "put").mockResolvedValue({
    publicId: "unowned-provider-key",
    width: 1200,
    height: 900,
    placeholderColor: null,
  })
  try {
    await expect(processSeedMedia(fixture.id)).rejects.toThrow()
  } finally {
    put.mockRestore()
  }
  expect(
    await db.select().from(seedAssets).where(eq(seedAssets.accepted, true))
  ).toHaveLength(0)
  const [intent] = await db.select().from(seedStorageIntents)
  expect(intent?.state).toBe("pending")
})

test("expired source fails explicitly while preserving its verified checkpoint", async () => {
  const fixture = await stagedArchive(1)
  await seedArchives.remove(fixture.archiveKey)
  expect(await runSeedPass()).toBe(0)
  const [operation] = await db
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, fixture.id))
  expect(operation).toMatchObject({
    state: "failed",
    stage: "store-images",
    errorCode: "seed_archive_source_expired",
  })
  expect(operation?.checkpoint.archiveKey).toBe(fixture.archiveKey)
})
