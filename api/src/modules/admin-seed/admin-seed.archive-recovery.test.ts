import { afterEach, beforeEach, expect, test } from "bun:test"
import { seedOperationSchema } from "@sayaratak/shared/schemas/admin-seed"
import { eq } from "drizzle-orm"

import { env } from "~/env"
import { db } from "~/shared/db/client"

import { resetDb } from "../../../tests/helpers"
import {
  archiveFixture,
  uploadFixture,
} from "../../../tests/seed-archive-fixture"
import { expireSeedArchiveReceipts } from "./admin-seed.archives.service"
import { seedStorageIntents } from "./admin-seed.assets.tables"
import { processSeedMedia } from "./admin-seed.media.service"
import { seedOperations } from "./admin-seed.tables"
import { processSeedArchiveValidation } from "./admin-seed.validation.service"

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

test("a competing archive is rejected before pulling its body", async () => {
  const fixture = await archiveFixture(1)
  expect((await uploadFixture(fixture)).status).toBe(202)
  let pulled = 0
  const source = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        pulled++
        controller.enqueue(fixture.bytes)
        controller.close()
      },
    },
    { highWaterMark: 0 }
  )
  expect((await uploadFixture(fixture, { body: source })).status).toBe(409)
  expect(pulled).toBe(0)
  expect(await db.select().from(seedOperations)).toHaveLength(1)
})

test("abandoned receiving operations fail and permit explicit same-digest source reupload", async () => {
  const fixture = await archiveFixture(1)
  const response = await uploadFixture(fixture)
  const operation = seedOperationSchema.parse(await response.json())
  await db
    .update(seedOperations)
    .set({
      state: "receiving",
      stage: "upload",
      updatedAt: new Date("2000-01-01T00:00:00.000Z"),
    })
    .where(eq(seedOperations.id, operation.id))
  expect(await expireSeedArchiveReceipts()).toBe(1)
  expect((await db.select().from(seedStorageIntents))[0]?.state).toBe("deleted")
  const replacement = await uploadFixture(fixture, {
    supersedesOperationId: operation.id,
  })
  expect(replacement.status).toBe(202)
  const [previous] = await db
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, operation.id))
  expect(previous?.state).toBe("failed")
  expect(previous?.activeSlot).toBeNull()
  expect(previous?.supersededBy).toBeTruthy()
})

test("a digest mismatch cannot queue a partial upload and persists exact cleanup intent", async () => {
  const fixture = await archiveFixture(1)
  const response = await uploadFixture({ ...fixture, digest: "f".repeat(64) })
  expect(response.status).toBe(422)
  const [operation] = await db.select().from(seedOperations)
  expect(operation?.state).toBe("failed")
  expect(operation?.stage).toBe("upload")
  expect((await db.select().from(seedStorageIntents))[0]?.state).toBe("deleted")
})

test("completed accepted archives replay the prior result without consuming another body", async () => {
  const fixture = await archiveFixture(1)
  const response = await uploadFixture(fixture)
  const operation = seedOperationSchema.parse(await response.json())
  expect(await processSeedArchiveValidation(operation.id)).toBe(1)
  expect(await processSeedMedia(operation.id)).toBe(1)
  let pulled = 0
  const source = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        pulled++
        controller.enqueue(fixture.bytes)
        controller.close()
      },
    },
    { highWaterMark: 0 }
  )
  const replay = await uploadFixture(fixture, { body: source })
  expect(replay.status).toBe(202)
  const repeated = seedOperationSchema.parse(await replay.json())
  expect(repeated.id).toBe(operation.id)
  expect(repeated.state).toBe("completed")
  expect(pulled).toBe(0)
})
