import { env } from "~/env"
import { db } from "~/shared/db/client"
import { type Executor, type Transaction, transaction } from "~/shared/db/tx"
import { files } from "~/shared/files/store"
import { fail } from "~/shared/http/errors"
import { clock } from "~/shared/time/clock"

import * as uploads from "./uploads.queries"
import * as q from "./uploads.seed.queries"
import type { SeedImageIntent, SeedStoredImage } from "./uploads.seed.types"

export type { SeedImageIntent, SeedStoredImage } from "./uploads.seed.types"

/** Derives the reserved provider identity only from a validated server intent. */
export function seedImageKey(input: Omit<SeedImageIntent, "immutableKey">) {
  const parts = [input.datasetId, input.operationId, input.assetId]
  if (parts.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))) fail.conflict()
  if (!Number.isSafeInteger(input.generation) || input.generation < 1)
    fail.conflict()
  if (!/^[a-f0-9]{64}$/.test(input.normalizedDigest)) fail.conflict()
  return `sayaratak/${env.APP_ENV}/seed/${parts.join("/")}/${input.generation}/${input.normalizedDigest}`
}

/** Reserves exact provenance before uploading; retries rewrite the same intended bytes. */
export async function storeSeedImage(
  input: SeedImageIntent
): Promise<SeedStoredImage> {
  const digest = new Bun.CryptoHasher("sha256")
    .update(input.bytes)
    .digest("hex")
  if (
    input.immutableKey !== seedImageKey(input) ||
    digest !== input.normalizedDigest
  )
    fail.conflict()
  const id = `upseed${new Bun.CryptoHasher("sha256").update(input.immutableKey).digest("hex")}`
  await reserveSeedImage(id, input)
  // No transaction spans this provider call. The reservation survives lost acknowledgments.
  const stored = await files.put({
    bytes: input.bytes,
    mime: input.mime,
    delivery: "public",
    folder: "seed",
    immutableKey: input.immutableKey,
  })
  if (
    stored.publicId !== input.immutableKey ||
    stored.width < 1 ||
    stored.height < 1
  )
    fail.conflict()
  await q.updateSeedStored(db, { id, stored })
  return {
    immutableKey: stored.publicId,
    uploadId: id,
    inputWidth: input.width,
    inputHeight: input.height,
    providerWidth: stored.width,
    providerHeight: stored.height,
    digest,
  }
}

/** Locks exact dataset-owned upload bindings for the caller's atomic record batch. */
export async function getSeedUploads(
  ex: Executor,
  input: { datasetId: string; ids: string[] }
) {
  const rows = await q.listSeedUploads(ex, input)
  if (rows.length !== new Set(input.ids).size) fail.conflict()
  if (
    rows.some(
      (row) =>
        row.width === null ||
        row.height === null ||
        row.kind !== "image" ||
        row.delivery !== "public"
    )
  )
    fail.conflict()
  return rows
}

/** Assigns reserved seed images only inside the provenance-owning record transaction. */
export async function attachSeedImages(
  tx: Transaction,
  input: { datasetId: string; ownerUserId: string; ids: string[] }
) {
  const rows = await getSeedUploads(tx, input)
  if (
    rows.some(
      (row) => row.ownerUserId !== null && row.ownerUserId !== input.ownerUserId
    )
  )
    fail.conflict()
  await q.updateSeedAttached(tx, { ...input, at: clock.now() })
}

async function reserveSeedImage(id: string, input: SeedImageIntent) {
  await transaction(async (tx) => {
    await q.insertSeedReservation(tx, {
      id,
      seedDatasetId: input.datasetId,
      ownerUserId: null,
      kind: "image",
      delivery: "public",
      cloudinaryId: input.immutableKey,
      bytes: input.bytes.length,
      mime: input.mime,
      createdAt: clock.now(),
    })
    const row = await uploads.getUpload(tx, id)
    if (
      !row ||
      row.seedDatasetId !== input.datasetId ||
      row.cloudinaryId !== input.immutableKey ||
      row.bytes !== input.bytes.length ||
      row.mime !== input.mime
    )
      fail.conflict()
  })
}
