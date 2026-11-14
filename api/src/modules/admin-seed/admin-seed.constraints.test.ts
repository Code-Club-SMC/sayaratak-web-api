import { afterEach, beforeEach, expect, test } from "bun:test"
import { seedStatusSchema } from "@sayaratak/shared/schemas/admin-seed"
import { eq } from "drizzle-orm"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import { user } from "~/modules/auth/auth.tables"
import { listings } from "~/modules/listings/listings.tables"

import { adminCaller } from "../../../tests/admin"
import { resetDb } from "../../../tests/helpers"
import { seedDatasets, seedOperations } from "./admin-seed.tables"

const ORIGINAL = { enabled: env.ADMIN_SEED_ENABLED, appEnv: env.APP_ENV }
let datasetId = ""
beforeEach(async () => {
  env.ADMIN_SEED_ENABLED = true
  env.APP_ENV = "test"
  await resetDb()
  const response = await adminCaller()("POST", "/admin/seed/prepare", {})
  const dataset = seedStatusSchema.parse(await response.json()).dataset
  if (!dataset) throw new Error("preparation creates a dataset")
  datasetId = dataset.id
})
afterEach(() => {
  env.ADMIN_SEED_ENABLED = ORIGINAL.enabled
  env.APP_ENV = ORIGINAL.appEnv
})

function operation(id: string) {
  return {
    id,
    datasetId,
    kind: "seed",
    state: "queued",
    stage: "insert-businesses",
    actorId: "u-new",
    actorIp: "127.0.0.1",
    total: 230,
    createdAt: clock.now(),
    updatedAt: clock.now(),
  } satisfies typeof seedOperations.$inferInsert
}

test("the database prevents two live datasets even without service-level checks", async () => {
  const [existing] = await db.select().from(seedDatasets)
  if (!existing) throw new Error("the dataset exists")
  await expect(
    Promise.resolve(
      db.insert(seedDatasets).values({ ...existing, id: "duplicate-dataset" })
    )
  ).rejects.toThrow()
})

test("one active operation survives failures and blocks competing operation kinds", async () => {
  await db.insert(seedOperations).values(operation("operation-one"))
  await expect(
    Promise.resolve(
      db.insert(seedOperations).values({
        ...operation("operation-two"),
        kind: "archive",
        state: "receiving",
        stage: "upload",
      })
    )
  ).rejects.toThrow()
  await db
    .update(seedOperations)
    .set({ state: "failed", completed: 5 })
    .where(eq(seedOperations.id, "operation-one"))
  await expect(
    Promise.resolve(
      db.insert(seedOperations).values(operation("operation-three"))
    )
  ).rejects.toThrow()
})

test("progress cannot exceed totals or claim completion before all units commit", async () => {
  await db.insert(seedOperations).values(operation("operation-one"))
  await expect(
    Promise.resolve(db.update(seedOperations).set({ completed: 231 }))
  ).rejects.toThrow()
  await expect(
    Promise.resolve(
      db.update(seedOperations).set({
        state: "completed",
        stage: "complete",
        activeSlot: null,
      })
    )
  ).rejects.toThrow()
  await db.update(seedOperations).set({
    state: "completed",
    stage: "complete",
    completed: 230,
    activeSlot: null,
  })
  await db.insert(seedOperations).values(operation("operation-next"))
  expect(await db.select().from(seedOperations)).toHaveLength(2)
})

test("deleting an actor cannot delete the prepared dataset or operation history", async () => {
  await db.update(seedDatasets).set({ createdBy: "u-new" })
  await db.insert(seedOperations).values(operation("operation-one"))
  await db.delete(user).where(eq(user.id, "u-new"))
  const [dataset] = await db.select().from(seedDatasets)
  const [row] = await db.select().from(seedOperations)
  expect(dataset?.id).toBe(datasetId)
  expect(dataset?.createdBy).toBeNull()
  expect(row?.actorId).toBeNull()
  expect(row?.state).toBe("queued")
})

test("migration defaults preserve existing real rows without assigning seed ownership", async () => {
  const rows = await db
    .select({
      owner: listings.seedDatasetId,
      hidden: listings.seedHidden,
    })
    .from(listings)
  expect(rows.length).toBeGreaterThan(0)
  expect(rows.every((row) => row.owner === null && row.hidden === false)).toBe(
    true
  )
  await expect(Promise.resolve(db.delete(seedDatasets))).rejects.toThrow()
})

test("durable progress stays below 100 until its completion transaction", async () => {
  await db.insert(seedOperations).values({
    ...operation("operation-progress"),
    state: "running",
    completed: 230,
  })
  const admin = adminCaller()
  const running = seedStatusSchema.parse(
    await (await admin("GET", "/admin/seed")).json()
  )
  expect(running.operation?.progress).toEqual({
    stage: "insert-businesses",
    completed: 230,
    total: 230,
    percent: 99,
  })
  await db.update(seedOperations).set({
    state: "completed",
    stage: "complete",
    activeSlot: null,
  })
  const completed = seedStatusSchema.parse(
    await (await admin("GET", "/admin/seed")).json()
  )
  expect(completed.operation?.progress.percent).toBe(100)
  expect(completed.operation).not.toHaveProperty("actorId")
})
