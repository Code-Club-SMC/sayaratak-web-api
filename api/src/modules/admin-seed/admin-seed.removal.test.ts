import { afterEach, beforeEach, expect, test } from "bun:test"
import { eq } from "drizzle-orm"
import {
  seedOperationSchema,
  seedStatusSchema,
} from "@sayaratak/shared/schemas/admin-seed"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { dealerships } from "~/modules/businesses/businesses.tables"
import { favorites } from "~/modules/favorites/favorites.tables"
import { listings } from "~/modules/listings/listings.tables"
import { reviews } from "~/modules/reviews/reviews.tables"

import { seedPreviewFixture } from "../../../tests/admin-seed"
import { call, req, resetDb, signIn } from "../../../tests/helpers"
import { processSeedRemoval } from "./admin-seed.removal.service"
import { seedDatasets } from "./admin-seed.tables"

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

test("clean removal without dependencies leaves zero public rows and transitions to removed", async () => {
  const { listingId, businessId, datasetId } = await seedPreviewFixture()
  const admin = await signIn("admin")
  const [dataset] = await db
    .select()
    .from(seedDatasets)
    .where(eq(seedDatasets.id, datasetId))
  if (!dataset) throw new Error("dataset missing")

  const res = await call(admin, "/admin/seed/remove", {
    method: "POST",
    body: {
      datasetId,
      manifestDigest: dataset.manifestDigest,
      confirmation: true,
    },
  })
  expect(res.status).toBe(202)
  const op = seedOperationSchema.parse(await res.json())
  expect(op.kind).toBe("remove")
  expect(op.state).toBe("queued")

  while ((await processSeedRemoval(op.id)) > 0) {}

  const statusRes = await call(admin, "/admin/seed", { method: "GET" })
  const finalStatus = seedStatusSchema.parse(await statusRes.json())
  expect(finalStatus.dataset?.state).toBe("removed")
  expect(finalStatus.operation?.state).toBe("completed")
  expect(finalStatus.operation?.retainedRecords).toBe(0)

  const [l] = await db.select().from(listings).where(eq(listings.id, listingId))
  const [b] = await db
    .select()
    .from(dealerships)
    .where(eq(dealerships.id, businessId))
  expect(l).toBeUndefined()
  expect(b).toBeUndefined()
  expect((await req(`/listings/${listingId}`)).status).toBe(404)
})

test("removal with a preexisting real favorite retains the listing and preserves the saved row", async () => {
  const { listingId, datasetId } = await seedPreviewFixture()
  const admin = await signIn("admin")
  const realUserId = "u-omar"

  await db.insert(favorites).values({
    userId: realUserId,
    listingId,
    createdAt: new Date(),
  })

  const [listingRow] = await db
    .select()
    .from(listings)
    .where(eq(listings.id, listingId))
  const listingSlug = listingRow?.slug

  const [dataset] = await db
    .select()
    .from(seedDatasets)
    .where(eq(seedDatasets.id, datasetId))
  if (!dataset) throw new Error("dataset missing")

  const removeRes = await call(admin, "/admin/seed/remove", {
    method: "POST",
    body: {
      datasetId,
      manifestDigest: dataset.manifestDigest,
      confirmation: true,
    },
  })
  expect(removeRes.status).toBe(202)
  const op = seedOperationSchema.parse(await removeRes.json())

  while ((await processSeedRemoval(op.id)) > 0) {}

  const statusResponse = await call(admin, "/admin/seed", { method: "GET" })
  const finalStatus = seedStatusSchema.parse(await statusResponse.json())
  expect(finalStatus.dataset?.state).toBe("retained")
  expect(finalStatus.operation?.state).toBe("completed")
  expect(finalStatus.operation?.retainedRecords).toBeGreaterThan(0)

  const saved = await db
    .select()
    .from(favorites)
    .where(eq(favorites.listingId, listingId))
  expect(saved.some((row) => row.userId === realUserId)).toBe(true)

  if (listingSlug) {
    const publicRes = await req(`/listings/${listingSlug}`)
    expect(publicRes.status).toBe(404)
  }
})

test("removal with a real business review retains the business and reports retained status", async () => {
  const { businessId, datasetId } = await seedPreviewFixture()
  const admin = await signIn("admin")

  await db.insert(reviews).values({
    id: "rev-real-1",
    targetType: "dealership",
    targetId: businessId,
    authorId: "u-omar",
    authorName: "Omar",
    rating: 5,
    createdAt: new Date(),
  })

  const [dataset] = await db
    .select()
    .from(seedDatasets)
    .where(eq(seedDatasets.id, datasetId))
  if (!dataset) throw new Error("dataset missing")

  const res = await call(admin, "/admin/seed/remove", {
    method: "POST",
    body: {
      datasetId,
      manifestDigest: dataset.manifestDigest,
      confirmation: true,
    },
  })
  expect(res.status).toBe(202)
  const op = seedOperationSchema.parse(await res.json())

  while ((await processSeedRemoval(op.id)) > 0) {}

  const statusResponse = await call(admin, "/admin/seed", { method: "GET" })
  const finalStatus = seedStatusSchema.parse(await statusResponse.json())
  expect(finalStatus.dataset?.state).toBe("retained")
  expect(finalStatus.operation?.state).toBe("completed")
  expect(finalStatus.operation?.retainedRecords).toBeGreaterThan(0)

  const [b] = await db
    .select()
    .from(dealerships)
    .where(eq(dealerships.id, businessId))
  expect(b?.seedHidden).toBe(true)
})
