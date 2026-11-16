import { db } from "~/shared/db/client"
import { transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { retryHostDeletes } from "~/modules/uploads/uploads.host.service"
import {
  hasSeedImageDeletion,
  queueSeedImageDeletion,
} from "~/modules/uploads/uploads.seed-cleanup.service"

import * as q from "./admin-seed.media.queries"
import { listAbandonedImages } from "./admin-seed.media-cleanup.queries"
import * as work from "./admin-seed.work.queries"

const CLEANUP_PASS_SIZE = 5

/** Recovers abandoned immutable puts through the existing file-deletion outbox. */
export async function cleanUpSeedImages(): Promise<number> {
  const abandoned = await listAbandonedImages(db, CLEANUP_PASS_SIZE)
  for (const { intent } of abandoned) await queueAbandonedImage(intent)
  await retryHostDeletes(CLEANUP_PASS_SIZE)
  const pending = await q.listCleanupImages(db, CLEANUP_PASS_SIZE)
  let completed = 0
  for (const intent of pending) {
    await transaction(async (tx) => {
      await work.lockWorkDataset(tx, intent.datasetId)
      if (await hasSeedImageDeletion(tx, intent.objectKey)) return
      await q.updateIntentState(tx, {
        objectKey: intent.objectKey,
        state: "deleted",
      })
      completed += 1
    })
  }
  return completed
}

async function queueAbandonedImage(
  intent: Awaited<ReturnType<typeof listAbandonedImages>>[number]["intent"]
) {
  await transaction(async (tx) => {
    await work.lockWorkDataset(tx, intent.datasetId)
    const operation = intent.operationId
      ? await work.lockWorkOperation(tx, intent.operationId)
      : null
    if (!operation?.supersededBy) fail.conflict()
    const images = await q.listOperationImages(tx, operation.id)
    const image = images.find(
      (row) =>
        row.assetId === intent.assetId && row.generation === intent.generation
    )
    if (!image?.mime || image.accepted) fail.conflict()
    await queueSeedImageDeletion(tx, {
      datasetId: intent.datasetId,
      immutableKey: intent.objectKey,
      mime: image.mime,
    })
    await q.updateIntentState(tx, {
      objectKey: intent.objectKey,
      state: "delete-pending",
    })
  })
}
