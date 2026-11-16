import { afterEach, beforeEach, expect, test } from "bun:test"
import { eq } from "drizzle-orm"
import {
  seedOperationSchema,
  seedStatusSchema,
} from "@sayaratak/shared/schemas/admin-seed"
import { siteSchema } from "@sayaratak/shared/schemas/responses"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { threads } from "~/modules/messaging/messaging.tables"
import { uploads } from "~/modules/uploads/uploads.tables"
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

test("prepared-only dataset can be removed and clears live slot without public rows", async () => {
  const admin = await signIn("admin")
  await call(admin, "/admin/seed/prepare", { method: "POST", body: {} })

  const [dataset] = await db
    .select()
    .from(seedDatasets)
    .where(eq(seedDatasets.liveSlot, true))
  if (!dataset) throw new Error("dataset missing")

  const res = await call(admin, "/admin/seed/remove", {
    method: "POST",
    body: {
      datasetId: dataset.id,
      manifestDigest: dataset.manifestDigest,
      confirmation: true,
    },
  })
  expect(res.status).toBe(202)
  const op = seedOperationSchema.parse(await res.json())

  while ((await processSeedRemoval(op.id)) > 0) {}

  const statusResponse = await call(admin, "/admin/seed", { method: "GET" })
  const finalStatus = seedStatusSchema.parse(await statusResponse.json())
  expect(finalStatus.dataset?.state).toBe("removed")
  expect(finalStatus.operation?.state).toBe("completed")
  expect(finalStatus.operation?.retainedRecords).toBe(0)
})

test("real messaging thread pointing to seed listing retains listing and disables public demo notice", async () => {
  const { listingId, datasetId } = await seedPreviewFixture()
  const admin = await signIn("admin")

  await db.insert(threads).values({
    id: "th-real-1",
    subjectType: "listing",
    subjectId: listingId,
    subjectTitle: { ar: "سيارة", en: "Car" },
    pairKey: "u-omar:u-seed-1",
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

  const site = siteSchema.parse(await (await req("/site")).json())
  expect(site.demoActive).toBe(false)

  while ((await processSeedRemoval(op.id)) > 0) {}

  const statusResponse = await call(admin, "/admin/seed", { method: "GET" })
  const finalStatus = seedStatusSchema.parse(await statusResponse.json())
  expect(finalStatus.dataset?.state).toBe("retained")
  expect(finalStatus.operation?.state).toBe("completed")
  expect(finalStatus.operation?.retainedRecords).toBeGreaterThan(0)
})

test("shared cloudinary object with real upload row is not deleted from host", async () => {
  const { datasetId } = await seedPreviewFixture()
  const admin = await signIn("admin")

  const [seedUp] = await db
    .select()
    .from(uploads)
    .where(eq(uploads.seedDatasetId, datasetId))
    .limit(1)
  if (!seedUp?.cloudinaryId) throw new Error("seed upload missing")

  await db.insert(uploads).values({
    id: "up-real-shared-1",
    ownerUserId: "u-omar",
    kind: "image",
    delivery: "public",
    cloudinaryId: seedUp.cloudinaryId,
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

  const [realUp] = await db
    .select()
    .from(uploads)
    .where(eq(uploads.id, "up-real-shared-1"))
  expect(realUp).toBeDefined()
  expect(realUp?.cloudinaryId).toBe(seedUp.cloudinaryId)
})

test("repeated remove requests return the same active operation", async () => {
  const { datasetId } = await seedPreviewFixture()
  const admin = await signIn("admin")
  const [dataset] = await db
    .select()
    .from(seedDatasets)
    .where(eq(seedDatasets.id, datasetId))
  if (!dataset) throw new Error("dataset missing")

  const [first, second] = await Promise.all([
    call(admin, "/admin/seed/remove", {
      method: "POST",
      body: {
        datasetId,
        manifestDigest: dataset.manifestDigest,
        confirmation: true,
      },
    }),
    call(admin, "/admin/seed/remove", {
      method: "POST",
      body: {
        datasetId,
        manifestDigest: dataset.manifestDigest,
        confirmation: true,
      },
    }),
  ])
  expect(first.status).toBe(202)
  expect(second.status).toBe(202)
  const b1 = seedOperationSchema.parse(await first.json())
  const b2 = seedOperationSchema.parse(await second.json())
  expect(b1.id).toBe(b2.id)
})
