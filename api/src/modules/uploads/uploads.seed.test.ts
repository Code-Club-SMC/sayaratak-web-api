import { beforeEach, expect, test } from "bun:test"
import { eq } from "drizzle-orm"

import { db } from "~/shared/db/client"
import { transaction } from "~/shared/db/tx"
import { files } from "~/shared/files/store"
import { clock } from "~/shared/time/clock"

import { resetDb } from "../../../tests/helpers"
import { cleanUp } from "./uploads.cleanup.service"
import { retryHostDeletes } from "./uploads.host.service"
import { attachMedia, copyMedia } from "./uploads.media.service"
import { queueSeedImageDeletion } from "./uploads.seed-cleanup.service"
import {
  getSeedUploads,
  seedImageKey,
  storeSeedImage,
} from "./uploads.seed.service"
import type { SeedImageIntent } from "./uploads.seed.types"
import { fileDeletions, uploads } from "./uploads.tables"

beforeEach(resetDb)

function imageIntent(): SeedImageIntent {
  const bytes = Uint8Array.from([1, 2, 3])
  const digest = new Bun.CryptoHasher("sha256").update(bytes).digest("hex")
  const input = {
    datasetId: "dataset",
    operationId: "operation",
    assetId: "asset",
    generation: 1,
    inputDigest: digest,
    normalizedDigest: digest,
    bytes,
    mime: "image/jpeg",
    width: 1600,
    height: 1200,
  } satisfies Omit<SeedImageIntent, "immutableKey">
  return { ...input, immutableKey: seedImageKey(input) }
}

test("seed reservation survives days without becoming a generic orphan", async () => {
  const stored = await storeSeedImage(imageIntent())
  await db
    .update(uploads)
    .set({
      createdAt: new Date(clock.now().getTime() - 72 * 3_600_000),
    })
    .where(eq(uploads.id, stored.uploadId))
  await cleanUp()
  const rows = await transaction((tx) =>
    getSeedUploads(tx, {
      datasetId: "dataset",
      ids: [stored.uploadId],
    })
  )
  expect(rows).toHaveLength(1)
  expect(rows[0]?.attachedAt).toBeNull()
  expect(await storeSeedImage(imageIntent())).toEqual(stored)
})

test("ordinary attachment and duplication cannot consume reserved seed uploads", async () => {
  const stored = await storeSeedImage(imageIntent())
  await expect(
    transaction((tx) =>
      attachMedia(tx, {
        ownerUserId: "ordinary",
        ids: [stored.uploadId],
        kept: [],
      })
    )
  ).rejects.toThrow()
  await expect(
    transaction((tx) =>
      copyMedia(tx, {
        ownerUserId: "ordinary",
        ids: [stored.uploadId],
      })
    )
  ).rejects.toThrow()
})

test("provider success before upload-row creation is recovered by the existing deletion outbox", async () => {
  const input = imageIntent()
  await files.put({
    bytes: input.bytes,
    mime: input.mime,
    delivery: "public",
    folder: "seed",
    immutableKey: input.immutableKey,
  })
  await transaction((tx) => queueSeedImageDeletion(tx, input))
  expect(await db.select().from(fileDeletions)).toHaveLength(1)
  expect(await retryHostDeletes(5)).toBe(1)
  expect(await db.select().from(fileDeletions)).toHaveLength(0)
  await expect(
    files.read({ publicId: input.immutableKey, mime: input.mime })
  ).rejects.toThrow()
})

test("a changed digest cannot reuse the immutable intent", async () => {
  const input = imageIntent()
  await expect(
    storeSeedImage({ ...input, bytes: Uint8Array.from([9]) })
  ).rejects.toThrow()
  expect(
    await db
      .select()
      .from(uploads)
      .where(eq(uploads.seedDatasetId, input.datasetId))
  ).toHaveLength(0)
})

test("a shared provider reference keeps seed cleanup visibly pending", async () => {
  const input = imageIntent()
  await storeSeedImage(input)
  await db.insert(uploads).values({
    id: "surviving-reference",
    kind: "image",
    delivery: "public",
    cloudinaryId: input.immutableKey,
    mime: input.mime,
    createdAt: clock.now(),
  })
  await transaction((tx) => queueSeedImageDeletion(tx, input))
  expect(await retryHostDeletes(5)).toBe(0)
  const [pending] = await db.select().from(fileDeletions)
  expect(pending).toMatchObject({ publicId: input.immutableKey, attempts: 0 })
  await db.delete(uploads).where(eq(uploads.id, "surviving-reference"))
  expect(await retryHostDeletes(5)).toBe(1)
  expect(await db.select().from(fileDeletions)).toHaveLength(0)
})
