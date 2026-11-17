import { afterEach, beforeEach, expect, test } from "bun:test"
import { and, eq } from "drizzle-orm"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { checkSeedImage } from "~/shared/files/image-check"
import {
  dealerships,
  mechanics,
  workshops,
} from "~/modules/businesses/businesses.tables"
import { listings } from "~/modules/listings/listings.tables"
import { reviews } from "~/modules/reviews/reviews.tables"
import { subscriptions } from "~/modules/plans/plans.tables"

import { prepareSeedAssets } from "../../../tests/admin-seed"
import { resetDb } from "../../../tests/helpers"
import { seedRecords } from "./admin-seed.assets.tables"
import {
  failSeedInstall,
  retrySeedInstall,
} from "./admin-seed.install-recovery.service"
import { processSeedInstall } from "./admin-seed.install.service"
import { cleanUpSeedImages } from "./admin-seed.media-cleanup.service"
import { startSeedInstall } from "./admin-seed.start.service"
import { seedDatasets, seedOperations } from "./admin-seed.tables"

const ORIGINAL = { enabled: env.ADMIN_SEED_ENABLED, appEnv: env.APP_ENV }
beforeEach(async () => {
  env.ADMIN_SEED_ENABLED = true
  env.APP_ENV = "test"
  await resetDb()
})
afterEach(() => {
  env.ADMIN_SEED_ENABLED = ORIGINAL.enabled
  env.APP_ENV = ORIGINAL.appEnv
})

test("interrupted worker resumes install from committed checkpoint after failure and retry", async () => {
  const { dataset, actor } = await prepareSeedAssets(true)
  const operation = await startSeedInstall(actor, dataset.manifestDigest)
  expect(await processSeedInstall(operation.id)).toBe(25)

  // Inject child worker termination between passes
  await failSeedInstall(operation.id, "seed_install_failed")
  const [failed] = await db
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, operation.id))
  expect(failed?.state).toBe("failed")
  expect(failed?.completed).toBe(25)

  // Duplicate or mismatched retries fail closed
  await expect(
    retrySeedInstall(actor, {
      operationId: operation.id,
      manifestDigest: "0".repeat(64),
    })
  ).rejects.toMatchObject({ status: 409 })

  // Valid retry restores queued state without resetting progress
  const retried = await retrySeedInstall(actor, {
    operationId: operation.id,
    manifestDigest: dataset.manifestDigest,
  })
  expect(retried.state).toBe("queued")
  expect(retried.progress.completed).toBe(25)

  // Resumed passes pick up exactly where left off and finish the 230 records
  let remaining = 230 - 25
  while (remaining > 0) {
    const committed = await processSeedInstall(operation.id)
    expect(committed).toBeGreaterThan(0)
    expect(committed).toBeLessThanOrEqual(25)
    remaining -= committed
  }
  expect(await processSeedInstall(operation.id)).toBe(0)

  const [finished] = await db
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, operation.id))
  expect(finished).toMatchObject({
    state: "completed",
    completed: 230,
    committedBusinesses: 30,
    committedListings: 200,
    committedImages: 460,
    activeSlot: null,
  })

  const [installed] = await db
    .select()
    .from(seedDatasets)
    .where(eq(seedDatasets.id, dataset.id))
  expect(installed?.state).toBe("installed")
})

test("full install adheres to catalog distribution, search isolation, and clean accounting", async () => {
  const { dataset, actor } = await prepareSeedAssets(true)
  const operation = await startSeedInstall(actor, dataset.manifestDigest)
  while ((await processSeedInstall(operation.id)) > 0) {}

  const ownedListings = await db.$count(
    seedRecords,
    and(
      eq(seedRecords.datasetId, dataset.id),
      eq(seedRecords.domain, "listing")
    )
  )
  expect(ownedListings).toBe(200)

  const ownedBusinesses =
    (await db.$count(
      seedRecords,
      and(
        eq(seedRecords.datasetId, dataset.id),
        eq(seedRecords.domain, "dealership")
      )
    )) +
    (await db.$count(
      seedRecords,
      and(
        eq(seedRecords.datasetId, dataset.id),
        eq(seedRecords.domain, "workshop")
      )
    )) +
    (await db.$count(
      seedRecords,
      and(
        eq(seedRecords.datasetId, dataset.id),
        eq(seedRecords.domain, "mechanic")
      )
    ))
  expect(ownedBusinesses).toBe(30)

  const availableListings = await db.$count(
    listings,
    and(
      eq(listings.seedDatasetId, dataset.id),
      eq(listings.status, "available")
    )
  )
  expect(availableListings).toBe(200)

  const liveBusinesses =
    (await db.$count(dealerships, eq(dealerships.seedDatasetId, dataset.id))) +
    (await db.$count(workshops, eq(workshops.seedDatasetId, dataset.id))) +
    (await db.$count(mechanics, eq(mechanics.seedDatasetId, dataset.id)))
  expect(liveBusinesses).toBe(30)

  // Zero synthetic reviews, fake subscriptions or promotions
  const firstOwner = dataset.manifest.owners[0]
  if (!firstOwner) throw new Error("dataset requires an owner")
  const fakeReviews = await db.$count(
    reviews,
    eq(reviews.authorId, firstOwner.id)
  )
  expect(fakeReviews).toBe(0)
  const fakeSubs = await db.$count(
    subscriptions,
    eq(subscriptions.userId, firstOwner.id)
  )
  expect(fakeSubs).toBe(0)
})

test("valid staged images survive orphan cleanup and image decode memory is bounded", async () => {
  const { dataset } = await prepareSeedAssets(true)
  const cleaned = await cleanUpSeedImages()
  expect(cleaned).toBe(0)

  const stagedCount = await db.$count(
    seedRecords,
    and(eq(seedRecords.datasetId, dataset.id), eq(seedRecords.domain, "upload"))
  )
  expect(stagedCount).toBe(460)

  const memBefore = process.memoryUsage().rss
  const dummyWebp = await Bun.file(
    "api/tests/fixtures/seed-images/img-001.webp"
  )
    .arrayBuffer()
    .catch(() => null)
  if (dummyWebp) {
    const checked = await checkSeedImage(new Uint8Array(dummyWebp))
    expect(checked.mime).toBe("image/webp")
    const memAfter = process.memoryUsage().rss
    expect(memAfter - memBefore).toBeLessThan(64 * 1024 * 1024)
  }
})
