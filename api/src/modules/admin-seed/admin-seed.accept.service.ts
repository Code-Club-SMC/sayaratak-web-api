import { type Transaction, transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { clock } from "~/shared/time/clock"
import { queueSeedImageDeletion } from "~/modules/uploads/uploads.seed-cleanup.service"
import { getSeedUploads } from "~/modules/uploads/uploads.seed.service"

import { archiveCheckpointSchema } from "./admin-seed.archive.types"
import * as q from "./admin-seed.media.queries"
import * as work from "./admin-seed.work.queries"
import type {
  SeedDatasetRow,
  SeedOperationRow,
} from "./admin-seed.operations.queries"

/** Accepts every stored archive generation together, preserving the previous set on failure. */
export async function acceptSeedArchive(operationId: string): Promise<void> {
  await transaction(async (tx) => {
    const context = await lockAcceptance(tx, operationId)
    if (!context) return
    const { dataset, operation } = context
    const checkpoint = archiveCheckpointSchema.parse(operation.checkpoint)
    const images = await getStoredArchiveImages(tx, { dataset, checkpoint })
    if (
      images.some(
        (image) => !image.accepted && image.operationId !== operationId
      )
    )
      fail.conflict()
    const assetIds = checkpoint.entries.map((entry) => entry.assetId)
    const previous = await q.listAcceptedImages(tx, {
      datasetId: dataset.id,
      assetIds,
    })
    await assertSeedUploads(tx, {
      datasetId: dataset.id,
      images: [...images, ...previous],
    })
    await queueSupersededImages(tx, {
      previous,
      images,
      replacements: checkpoint.replaceGenerations,
    })
    await q.updateImagesUnaccepted(tx, { datasetId: dataset.id, assetIds })
    for (const image of images) await q.updateImagesAccepted(tx, image)
    await completeArchive(tx, { dataset, operation, imageCount: images.length })
  })
}

async function assertSeedUploads(
  tx: Transaction,
  input: {
    datasetId: string
    images: Awaited<ReturnType<typeof q.listMediaImages>>
  }
) {
  const ids = input.images.flatMap((image) =>
    image.uploadId ? [image.uploadId] : []
  )
  const uploads = await getSeedUploads(tx, { datasetId: input.datasetId, ids })
  for (const image of input.images) {
    const upload = uploads.find((row) => row.id === image.uploadId)
    if (!upload || upload.cloudinaryId !== image.providerId) fail.conflict()
  }
}

async function completeArchive(
  tx: Transaction,
  input: {
    dataset: SeedDatasetRow
    operation: SeedOperationRow
    imageCount: number
  }
) {
  const at = clock.now()
  await work.updateWork(tx, {
    id: input.operation.id,
    values: {
      state: "completed",
      stage: "complete",
      activeSlot: null,
      completed: input.imageCount,
      total: input.imageCount,
      committedImages: input.imageCount,
      errorCode: null,
      updatedAt: at,
    },
  })
  if (
    (await q.countAcceptedImages(tx, input.dataset.id)) ===
    input.dataset.manifest.assets.length
  )
    await work.updateDatasetReady(tx, { id: input.dataset.id, at })
}

async function lockAcceptance(tx: Transaction, operationId: string) {
  const observed = await work.getWorkOperation(tx, operationId)
  if (!observed) fail.notFound()
  const dataset = await work.lockWorkDataset(tx, observed.datasetId)
  const operation = await work.lockWorkOperation(tx, operationId)
  if (!dataset || !operation) fail.notFound()
  if (operation.state === "completed") return null
  if (
    !["preparing", "ready"].includes(dataset.state) ||
    operation.kind !== "archive" ||
    operation.stage !== "store-images" ||
    operation.supersededBy ||
    !["queued", "running"].includes(operation.state)
  )
    fail.conflict()
  return { dataset, operation }
}

async function getStoredArchiveImages(
  tx: Transaction,
  input: {
    dataset: SeedDatasetRow
    checkpoint: ReturnType<typeof archiveCheckpointSchema.parse>
  }
) {
  const { checkpoint, dataset } = input
  const candidates = await q.listMediaImages(tx, {
    datasetId: dataset.id,
    assetIds: checkpoint.entries.map((entry) => entry.assetId),
  })
  const images = candidates.filter((image) =>
    checkpoint.entries.some(
      (entry) =>
        entry.assetId === image.assetId && entry.generation === image.generation
    )
  )
  if (!checkpoint.entries.length || images.length !== checkpoint.entries.length)
    fail.conflict()
  assertStoredEntries(checkpoint.entries, images)
  return images
}

function assertStoredEntries(
  entries: ReturnType<typeof archiveCheckpointSchema.parse>["entries"],
  images: Awaited<ReturnType<typeof q.listOperationImages>>
) {
  for (const entry of entries) {
    const image = images.find((row) => row.assetId === entry.assetId)
    if (
      !image ||
      image.generation !== entry.generation ||
      image.inputDigest !== entry.digest ||
      image.width !== entry.width ||
      image.height !== entry.height ||
      image.bytes !== entry.bytes ||
      image.mime !== entry.mime ||
      image.state !== "stored" ||
      !image.uploadId ||
      !image.providerId
    )
      fail.conflict()
  }
}

async function queueSupersededImages(
  tx: Transaction,
  input: {
    previous: Awaited<ReturnType<typeof q.listAcceptedImages>>
    images: Awaited<ReturnType<typeof q.listOperationImages>>
    replacements: ReturnType<
      typeof archiveCheckpointSchema.parse
    >["replaceGenerations"]
  }
) {
  for (const old of input.previous) {
    const image = input.images.find((row) => row.assetId === old.assetId)
    if (image?.generation === old.generation) continue
    if (
      !input.replacements.some(
        (entry) =>
          entry.assetId === old.assetId && entry.generation === old.generation
      )
    )
      fail.conflict()
    await queueSupersededImage(tx, old)
  }
}

async function queueSupersededImage(
  tx: Transaction,
  old: Awaited<ReturnType<typeof q.listAcceptedImages>>[number]
) {
  if (!old.providerId || !old.mime) fail.conflict()
  const intent = await q.getImageIntent(tx, old.providerId)
  if (!intent || intent.datasetId !== old.datasetId) fail.conflict()
  await queueSeedImageDeletion(tx, {
    datasetId: old.datasetId,
    immutableKey: old.providerId,
    mime: old.mime,
  })
  await q.updateIntentState(tx, {
    objectKey: old.providerId,
    state: "delete-pending",
  })
}
