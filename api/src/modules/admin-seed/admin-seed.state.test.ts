import { afterEach, beforeEach, expect, test } from "bun:test"
import { seedStatusSchema } from "@sayaratak/shared/schemas/admin-seed"
import { seedPromptPackSchema } from "@sayaratak/shared/schemas/seed-manifest"
import { count, eq } from "drizzle-orm"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { user } from "~/modules/auth/auth.tables"
import { listings } from "~/modules/listings/listings.tables"
import { countries } from "~/modules/taxonomy/taxonomy.tables"
import { auditLog } from "~/modules/audit/audit.tables"

import { adminCaller } from "../../../tests/admin"
import { resetDb } from "../../../tests/helpers"
import { seedAssets } from "./admin-seed.assets.tables"
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

test("an enabled empty dataset reports all 460 missing images and no simulated work", async () => {
  const response = await adminCaller()("GET", "/admin/seed")
  expect(response.status).toBe(200)
  const status = seedStatusSchema.parse(await response.json())
  expect(status.capability).toEqual({ enabled: true, missing: [] })
  expect(status.dataset).toBeNull()
  expect(status.operation).toBeNull()
  expect(status.assets).toEqual({ accepted: 0, missing: 460, rejected: 0 })
})

test("preparation persists the manifest and 460 expected assets without creating public data", async () => {
  const beforeUsers = await db.select({ count: count() }).from(user)
  const beforeListings = await db.select({ count: count() }).from(listings)
  const admin = adminCaller()
  const response = await admin("POST", "/admin/seed/prepare", {})
  expect(response.status).toBe(200)
  const status = seedStatusSchema.parse(await response.json())
  expect(status.dataset?.state).toBe("preparing")
  expect(status.operation).toBeNull()
  expect(await db.select({ count: count() }).from(seedAssets)).toEqual([
    { count: 460 },
  ])
  expect(
    await db
      .select({ count: count() })
      .from(auditLog)
      .where(eq(auditLog.action, "seed.prepare"))
  ).toEqual([{ count: 1 }])
  expect(await db.select({ count: count() }).from(user)).toEqual(beforeUsers)
  expect(await db.select({ count: count() }).from(listings)).toEqual(
    beforeListings
  )
  const download = await admin("GET", "/admin/seed/manifest")
  expect(download.status).toBe(200)
  expect(download.headers.get("cache-control")).toBe("no-store")
  expect(download.headers.get("content-disposition")).toContain("attachment")
  const pack = seedPromptPackSchema.parse(await download.json())
  expect(pack.assets).toHaveLength(460)
  expect(pack.records).toHaveLength(230)
  const reread = await admin("GET", "/admin/seed")
  expect(seedStatusSchema.parse(await reread.json()).dataset).toEqual(
    status.dataset
  )
})

test("concurrent prepares produce exactly one catalog and one asset generation", async () => {
  const admin = adminCaller()
  const responses = await Promise.all(
    Array.from({ length: 6 }, () => admin("POST", "/admin/seed/prepare", {}))
  )
  expect(responses.map((response) => response.status)).toEqual([
    200, 200, 200, 200, 200, 200,
  ])
  const statuses = await Promise.all(
    responses.map(async (response) =>
      seedStatusSchema.parse(await response.json())
    )
  )
  expect(new Set(statuses.map((status) => status.dataset?.id)).size).toBe(1)
  expect(await db.select({ count: count() }).from(seedDatasets)).toEqual([
    { count: 1 },
  ])
  expect(await db.select({ count: count() }).from(seedAssets)).toEqual([
    { count: 460 },
  ])
})

test("a mismatched persisted digest is never overwritten or downloaded", async () => {
  const admin = adminCaller()
  await admin("POST", "/admin/seed/prepare", {})
  await db.update(seedDatasets).set({ manifestDigest: "a".repeat(64) })
  expect((await admin("POST", "/admin/seed/prepare", {})).status).toBe(409)
  expect((await admin("GET", "/admin/seed/manifest")).status).toBe(409)
  const [row] = await db.select().from(seedDatasets)
  expect(row?.manifestDigest).toBe("a".repeat(64))
})

test("unavailable taxonomy aborts preparation without partial rows", async () => {
  await db
    .update(countries)
    .set({ enabled: false })
    .where(eq(countries.id, "sd"))
  const response = await adminCaller()("POST", "/admin/seed/prepare", {})
  expect(response.status).toBe(409)
  expect(await db.select({ count: count() }).from(seedDatasets)).toEqual([
    { count: 0 },
  ])
  expect(await db.select({ count: count() }).from(seedAssets)).toEqual([
    { count: 0 },
  ])
})

test("preparation rejects arbitrary catalog input and oversized bodies", async () => {
  const admin = adminCaller()
  expect(
    (await admin("POST", "/admin/seed/prepare", { records: [] })).status
  ).toBe(422)
  expect(
    (await admin("POST", "/admin/seed/prepare", { extra: "x".repeat(2000) }))
      .status
  ).toBe(422)
})

test("preparation rate limiting is separate from existing marketplace limits", async () => {
  const admin = adminCaller()
  for (let index = 0; index < 30; index += 1)
    expect((await admin("POST", "/admin/seed/prepare", {})).status).toBe(200)
  const limited = await admin("POST", "/admin/seed/prepare", {})
  expect(limited.status).toBe(429)
  expect(limited.headers.get("retry-after")).not.toBeNull()
})
