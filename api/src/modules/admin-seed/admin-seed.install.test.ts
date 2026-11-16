import { afterEach, beforeEach, expect, test } from "bun:test"
import { and, count, eq } from "drizzle-orm"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { listings } from "~/modules/listings/listings.tables"

import { prepareSeedAssets } from "../../../tests/admin-seed"
import { resetDb } from "../../../tests/helpers"
import { seedRecords } from "./admin-seed.assets.tables"
import { processSeedInstall } from "./admin-seed.install.service"
import { startSeedInstall } from "./admin-seed.start.service"
import { seedDatasets, seedOperations } from "./admin-seed.tables"

const ORIGINAL_ENABLED = env.ADMIN_SEED_ENABLED
beforeEach(async () => {
  env.ADMIN_SEED_ENABLED = true
  await resetDb()
})
afterEach(() => {
  env.ADMIN_SEED_ENABLED = ORIGINAL_ENABLED
})

test("missing required images and wrong digest never queue an install", async () => {
  const { dataset, actor } = await prepareSeedAssets(false)
  await expect(
    startSeedInstall(actor, dataset.manifestDigest)
  ).rejects.toMatchObject({ status: 409 })
  await expect(startSeedInstall(actor, "a".repeat(64))).rejects.toMatchObject({
    status: 409,
  })
  expect(await db.$count(seedOperations)).toBe(0)
})

test("two starts freeze one operation and restart resumes committed public counts in passes of at most 25", async () => {
  const { dataset, actor } = await prepareSeedAssets(true)
  const [first, second] = await Promise.all([
    startSeedInstall(actor, dataset.manifestDigest),
    startSeedInstall(actor, dataset.manifestDigest),
  ])
  expect(first.id).toBe(second.id)
  expect(await db.$count(seedOperations)).toBe(1)
  expect(await processSeedInstall(first.id)).toBe(25)
  const [checkpoint] = await db
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, first.id))
  expect(checkpoint).toMatchObject({
    completed: 25,
    committedBusinesses: 25,
    committedListings: 0,
  })
  // A new call uses only persisted state, including a commit whose acknowledgment was lost.
  let remaining = 230 - 25
  while (remaining > 0) {
    const committed = await processSeedInstall(first.id)
    expect(committed).toBeGreaterThan(0)
    expect(committed).toBeLessThanOrEqual(25)
    remaining -= committed
  }
  expect(await processSeedInstall(first.id)).toBe(0)
  const [done] = await db
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, first.id))
  expect(done).toMatchObject({
    state: "completed",
    completed: 230,
    committedBusinesses: 30,
    committedListings: 200,
    committedImages: 460,
    activeSlot: null,
  })
  expect(
    await db.$count(
      seedRecords,
      and(
        eq(seedRecords.datasetId, dataset.id),
        eq(seedRecords.domain, "listing")
      )
    )
  ).toBe(200)
  expect(
    await db.$count(
      seedRecords,
      and(
        eq(seedRecords.datasetId, dataset.id),
        eq(seedRecords.domain, "owner")
      )
    )
  ).toBe(30)
  const [installed] = await db
    .select()
    .from(seedDatasets)
    .where(eq(seedDatasets.id, dataset.id))
  expect(installed?.state).toBe("installed")
})

test("an unowned ID collision preserves the real row and rolls back provenance and progress together", async () => {
  const { dataset, actor } = await prepareSeedAssets(true)
  const collision = dataset.manifest.records.find(
    (record) => record.kind === "vehicle"
  )
  const [real] = await db.select().from(listings).limit(1)
  if (!collision || !real)
    throw new Error("test requires real and fictional listings")
  await db.insert(listings).values({
    ...real,
    id: collision.id,
    slug: `protected-real-${collision.id}`,
    title: "Protected real listing",
    seedDatasetId: null,
  })
  const operation = await startSeedInstall(actor, dataset.manifestDigest)
  await processSeedInstall(operation.id)
  const before = await db
    .select({ count: count() })
    .from(seedRecords)
    .where(eq(seedRecords.datasetId, dataset.id))
  await expect(processSeedInstall(operation.id)).rejects.toMatchObject({
    status: 409,
  })
  const [retained] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, collision.id))
  expect(retained?.title).toBe("Protected real listing")
  const [checkpoint] = await db
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, operation.id))
  expect(checkpoint?.completed).toBe(25)
  expect(
    await db
      .select({ count: count() })
      .from(seedRecords)
      .where(eq(seedRecords.datasetId, dataset.id))
  ).toEqual(before)
})
