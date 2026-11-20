import { afterEach, beforeEach, expect, spyOn, test } from "bun:test"
import { eq } from "drizzle-orm"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { ApiError } from "~/shared/http/errors"
import { seedArchives } from "~/shared/storage/seed-archives"
import { clock } from "~/shared/time/clock"
import { seedStorageIntents } from "~/modules/admin-seed/admin-seed.assets.tables"
import {
  seedDatasets,
  seedOperations,
} from "~/modules/admin-seed/admin-seed.tables"
import {
  seedMediaFailureCode,
  runSeedPass,
  runSeedPasses,
} from "~/modules/admin-seed/admin-seed.work.service"

import { prepareSeedAssets } from "../../tests/admin-seed"
import { resetDb } from "../../tests/helpers"
import { startSeedInstall } from "~/modules/admin-seed/admin-seed.start.service"
import { adminCaller } from "../../tests/admin"
import { adminSeedJob } from "./admin-seed.job"
import { jobs } from "./index"

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

test("registers one awaited minute job through the existing scheduler", () => {
  expect(adminSeedJob).toMatchObject({
    name: "admin-seed",
    schedule: "* * * * *",
  })
  expect(jobs.filter((job) => job.name === "admin-seed")).toHaveLength(1)
})

test("an empty queue reports zero work without inventing a completion", async () => {
  expect(await adminSeedJob.run()).toBe(0)
})

test("source expiry is explicit and does not confuse transient storage outages", () => {
  expect(
    seedMediaFailureCode(
      new ApiError("not_found", {
        archive: "validation.seed_archive_source_expired",
      })
    )
  ).toBe("seed_archive_source_expired")
  expect(seedMediaFailureCode(new Error("seed_archive_missing"))).toBe(
    "seed_archive_source_expired"
  )
  expect(seedMediaFailureCode({ code: "NoSuchKey" })).toBe(
    "seed_archive_source_expired"
  )
  expect(seedMediaFailureCode(new Error("network down"))).toBe(
    "seed_media_storage_failed"
  )
})

test("failed upload source cleanup retries even when no operation is queued", async () => {
  expect((await adminCaller()("POST", "/admin/seed/prepare", {})).status).toBe(
    200
  )
  const [dataset] = await db.select().from(seedDatasets)
  if (!dataset) throw new Error("dataset missing")
  const digest = "a".repeat(64)
  const objectKey = `admin-seed/${dataset.id}/failed-upload/${digest}.zip`
  await db.insert(seedOperations).values({
    id: "failed-upload",
    datasetId: dataset.id,
    kind: "archive",
    state: "failed",
    stage: "upload",
    total: 0,
    actorIp: "127.0.0.1",
    createdAt: clock.now(),
    updatedAt: clock.now(),
  })
  await db.insert(seedStorageIntents).values({
    id: "failed-source",
    datasetId: dataset.id,
    operationId: "failed-upload",
    provider: "r2",
    purpose: "archive",
    objectKey,
    digest,
    state: "delete-pending",
    createdAt: clock.now(),
  })
  const remove = spyOn(seedArchives, "remove").mockRejectedValueOnce(
    new Error("R2 unavailable")
  )
  try {
    expect(await runSeedPass()).toBe(0)
  } finally {
    remove.mockRestore()
  }
  const [pending] = await db
    .select()
    .from(seedStorageIntents)
    .where(eq(seedStorageIntents.id, "failed-source"))
  expect(pending?.state).toBe("delete-pending")
  expect(await runSeedPass()).toBe(0)
  const [deleted] = await db
    .select()
    .from(seedStorageIntents)
    .where(eq(seedStorageIntents.id, "failed-source"))
  expect(deleted?.state).toBe("deleted")
})

test("one run keeps taking passes until the queued work is done, and stops at its budget", async () => {
  const { dataset, actor } = await prepareSeedAssets(true)
  await startSeedInstall(actor, dataset.manifestDigest)
  // A zero budget stops after the first pass (an install pass commits at most 25 items).
  expect(await runSeedPasses(0)).toBe(25)
  // The default budget finishes the remaining 205 in the same call instead of one pass a minute.
  expect(await runSeedPasses()).toBe(205)
  expect(await runSeedPasses()).toBe(0)
})
