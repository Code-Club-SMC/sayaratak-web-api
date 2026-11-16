import { type Transaction, transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { clock } from "~/shared/time/clock"
import type {
  SeedImageIntent,
  SeedStoredImage,
} from "~/modules/uploads/uploads.seed.service"

import {
  archiveCheckpointSchema,
  type ValidatedArchiveEntry,
} from "./admin-seed.archive.types"
import * as q from "./admin-seed.media.queries"
import * as work from "./admin-seed.work.queries"

/** Makes the exact provider write intent durable before any external upload. */
export async function reserveMediaIntent(input: SeedImageIntent) {
  await transaction(async (tx) => {
    const dataset = await work.lockWorkDataset(tx, input.datasetId)
    const operation = await work.lockWorkOperation(tx, input.operationId)
    if (
      !dataset ||
      !operation ||
      operation.supersededBy ||
      !["preparing", "ready"].includes(dataset.state) ||
      operation.stage !== "store-images" ||
      !["queued", "running"].includes(operation.state)
    )
      fail.conflict()
    const checkpoint = archiveCheckpointSchema.parse(operation.checkpoint)
    const entry = checkpoint.entries.find(
      (item) =>
        item.assetId === input.assetId &&
        item.generation === input.generation &&
        item.digest === input.inputDigest
    )
    if (!entry) fail.conflict()
    await reserveGeneration(tx, { input, entry })
    await insertProviderIntent(tx, input)
    const intent = await q.getImageIntent(tx, input.immutableKey)
    if (
      !intent ||
      intent.datasetId !== input.datasetId ||
      intent.operationId !== input.operationId ||
      intent.assetId !== input.assetId ||
      intent.generation !== input.generation ||
      intent.purpose !== "image" ||
      intent.digest !== input.normalizedDigest ||
      intent.state === "delete-pending" ||
      intent.state === "deleted"
    )
      fail.conflict()
  })
}

/** Commits provider acknowledgment, upload provenance and honest image progress together. */
export async function commitSeedImage(
  input: SeedImageIntent,
  stored: SeedStoredImage
) {
  await transaction(async (tx) => {
    await work.lockWorkDataset(tx, input.datasetId)
    const operation = await work.lockWorkOperation(tx, input.operationId)
    if (!operation || operation.state === "failed" || operation.supersededBy)
      fail.conflict()
    if (operation.state === "completed") return
    await q.updateStoredImage(tx, {
      ...input,
      uploadId: stored.uploadId,
      providerId: input.immutableKey,
    })
    await q.updateIntentState(tx, {
      objectKey: input.immutableKey,
      state: "stored",
    })
    await q.insertImageRecord(tx, {
      datasetId: input.datasetId,
      domain: "upload",
      recordId: stored.uploadId,
      recordDigest: input.inputDigest,
      createdAt: clock.now(),
    })
    const completed = await countStoredCheckpoint(tx, {
      input,
      checkpoint: operation.checkpoint,
    })
    await work.updateWork(tx, {
      id: input.operationId,
      values: {
        state: "running",
        completed,
        updatedAt: clock.now(),
      },
    })
  })
}

async function insertProviderIntent(tx: Transaction, input: SeedImageIntent) {
  await q.insertImageIntent(tx, {
    id: `si${new Bun.CryptoHasher("sha256").update(input.immutableKey).digest("hex")}`,
    datasetId: input.datasetId,
    operationId: input.operationId,
    assetId: input.assetId,
    generation: input.generation,
    provider: "cloudinary",
    objectKey: input.immutableKey,
    digest: input.normalizedDigest,
    purpose: "image",
    createdAt: clock.now(),
  })
}

async function countStoredCheckpoint(
  tx: Transaction,
  context: { input: SeedImageIntent; checkpoint: Record<string, unknown> }
) {
  const checkpoint = archiveCheckpointSchema.parse(context.checkpoint)
  const images = await q.listMediaImages(tx, {
    datasetId: context.input.datasetId,
    assetIds: checkpoint.entries.map((entry) => entry.assetId),
  })
  return checkpoint.entries.filter((entry) =>
    images.some(
      (row) =>
        row.assetId === entry.assetId &&
        row.generation === entry.generation &&
        row.state === "stored"
    )
  ).length
}

async function reserveGeneration(
  tx: Transaction,
  context: { input: SeedImageIntent; entry: ValidatedArchiveEntry }
) {
  const { input, entry } = context
  await q.insertValidatedImage(tx, {
    datasetId: input.datasetId,
    assetId: input.assetId,
    generation: input.generation,
    filename: entry.filename,
    operationId: input.operationId,
    state: "validated",
    inputDigest: entry.digest,
    bytes: entry.bytes,
    width: entry.width,
    height: entry.height,
    mime: entry.mime,
    createdAt: clock.now(),
  })
  const images = await q.listMediaImages(tx, {
    datasetId: input.datasetId,
    assetIds: [input.assetId],
  })
  const image = images.find((row) => row.generation === input.generation)
  if (
    !image ||
    image.operationId !== input.operationId ||
    image.inputDigest !== input.inputDigest ||
    image.bytes !== entry.bytes ||
    image.width !== entry.width ||
    image.height !== entry.height ||
    image.mime !== entry.mime ||
    image.accepted
  )
    fail.conflict()
}
