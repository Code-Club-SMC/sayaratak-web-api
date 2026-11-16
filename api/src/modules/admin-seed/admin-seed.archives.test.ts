import { afterEach, beforeEach, expect, test } from "bun:test"
import { seedOperationSchema } from "@sayaratak/shared/schemas/admin-seed"
import { eq } from "drizzle-orm"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { checkSeedImage } from "~/shared/files/image-check"

import { adminCaller } from "../../../tests/admin"
import { req, resetDb, signIn } from "../../../tests/helpers"
import {
  archiveFixture,
  uploadFixture,
} from "../../../tests/seed-archive-fixture"
import { seedZipFixture } from "../../../tests/seed-zip-fixture"
import { archiveCheckpointSchema } from "./admin-seed.archive.types"
import { seedAssets, seedStorageIntents } from "./admin-seed.assets.tables"
import { buildSeedManifest } from "./admin-seed.catalog.service"
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

test("durably receives real ZIP bytes and fully validates without accepting partial generations", async () => {
  const fixture = await archiveFixture(6)
  const response = await uploadFixture(fixture)
  expect(response.status).toBe(202)
  const operation = seedOperationSchema.parse(await response.json())
  expect(operation.state).toBe("queued")
  expect(await processSeedArchiveValidation(operation.id)).toBe(5)
  const [stored] = await db
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, operation.id))
  expect(stored?.stage).toBe("validate")
  expect(stored?.completed).toBe(5)
  expect(await processSeedArchiveValidation(operation.id)).toBe(1)
  const [finished] = await db
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, operation.id))
  expect(finished?.stage).toBe("store-images")
  expect(
    archiveCheckpointSchema.parse(finished?.checkpoint).entries
  ).toHaveLength(6)
  expect(
    await db.select().from(seedAssets).where(eq(seedAssets.accepted, true))
  ).toHaveLength(0)
  expect((await db.select().from(seedStorageIntents))[0]?.state).toBe("stored")
})

test("a malformed final image fails the archive and leaves accepted mappings untouched", async () => {
  const fixture = await archiveFixture(2, true)
  await adminCaller()("POST", "/admin/seed/prepare", {})
  const checked = await checkSeedImage(fixture.image)
  const first = buildSeedManifest().assets[0]
  if (!first) throw new Error("missing fixture manifest asset")
  await db
    .update(seedAssets)
    .set({
      state: "stored",
      accepted: true,
      inputDigest: checked.digest,
      bytes: checked.bytes,
      width: checked.width,
      height: checked.height,
      mime: checked.mime,
      uploadId: "fixture-accepted-upload",
      providerId: "fixture-accepted-provider",
    })
    .where(eq(seedAssets.assetId, first.id))
  const response = await uploadFixture(fixture)
  expect(response.status).toBe(202)
  const operation = seedOperationSchema.parse(await response.json())
  expect(await processSeedArchiveValidation(operation.id)).toBe(0)
  const [stored] = await db
    .select()
    .from(seedOperations)
    .where(eq(seedOperations.id, operation.id))
  expect(stored?.state).toBe("failed")
  expect(stored?.errorCode).toBe("seed_archive_invalid")
  expect(
    archiveCheckpointSchema.parse(stored?.checkpoint).entries
  ).toHaveLength(0)
  const accepted = await db
    .select()
    .from(seedAssets)
    .where(eq(seedAssets.accepted, true))
  expect(accepted).toHaveLength(1)
  expect(accepted[0]?.uploadId).toBe("fixture-accepted-upload")
  expect(accepted[0]?.inputDigest).toBe(checked.digest)
})

test("unexpected manifest names fail before decoding otherwise valid pixels", async () => {
  const fixture = await archiveFixture(1)
  const bytes = seedZipFixture([
    { filename: "not-in-manifest.jpg", bytes: fixture.image },
  ])
  const response = await uploadFixture({
    ...fixture,
    bytes,
    digest: new Bun.CryptoHasher("sha256").update(bytes).digest("hex"),
  })
  const operation = seedOperationSchema.parse(await response.json())
  expect(await processSeedArchiveValidation(operation.id)).toBe(0)
  const [stored] = await db.select().from(seedOperations)
  expect(stored?.state).toBe("failed")
})

test("anonymous and regular accounts cannot consume the archive route", async () => {
  expect(
    (await req("/admin/seed/archives", { method: "POST", body: "zip" })).status
  ).toBe(401)
  const user = await signIn("user")
  expect(
    (
      await req("/admin/seed/archives", {
        method: "POST",
        headers: { cookie: user.cookie, origin: user.origin },
        body: "zip",
      })
    ).status
  ).toBe(403)
})
