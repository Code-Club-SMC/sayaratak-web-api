import { env } from "~/env"
import type { Transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { clock } from "~/shared/time/clock"

import * as uploads from "./uploads.queries"
import { SEED_DELETE_ID_PREFIX } from "./uploads.host.service"
import * as q from "./uploads.seed.queries"

/** Queues the exact immutable intent even when its provider acknowledgment was lost. */
export async function queueSeedImageDeletion(
  tx: Transaction,
  input: {
    datasetId: string
    immutableKey: string
    mime: string
    allowAttached?: boolean
  }
) {
  // The orchestrator must hold and verify the durable storage intent before calling this.
  const root = `sayaratak/${env.APP_ENV}/seed/${input.datasetId}/`
  if (
    !/^[a-zA-Z0-9_-]+$/.test(input.datasetId) ||
    !input.immutableKey.startsWith(root)
  )
    fail.conflict()
  const digest = new Bun.CryptoHasher("sha256")
    .update(input.immutableKey)
    .digest("hex")
  const uploadId = `upseed${digest}`
  const row = await uploads.getUpload(tx, uploadId)
  if (
    row &&
    (row.seedDatasetId !== input.datasetId ||
      row.cloudinaryId !== input.immutableKey ||
      (!input.allowAttached && row.attachedAt !== null))
  )
    fail.conflict()
  if (row) await uploads.deleteUploads(tx, [uploadId])
  // The existing retryHostDeletes worker owns all external deletion and retry policy.
  await q.insertSeedDeletion(tx, {
    id: `${SEED_DELETE_ID_PREFIX}${digest}`,
    publicId: input.immutableKey,
    mime: input.mime,
    at: clock.now(),
  })
}

/** Reports whether the existing file-deletion outbox still owns this intent. */
export function hasSeedImageDeletion(tx: Transaction, immutableKey: string) {
  const digest = new Bun.CryptoHasher("sha256")
    .update(immutableKey)
    .digest("hex")
  return q.hasSeedDeletion(tx, `${SEED_DELETE_ID_PREFIX}${digest}`)
}

/** Reports the granular outbox status of the intent for progress and retry tracking. */
export async function getSeedImageDeletionStatus(
  tx: Transaction,
  immutableKey: string
): Promise<"pending" | "completed" | "failed"> {
  const digest = new Bun.CryptoHasher("sha256")
    .update(immutableKey)
    .digest("hex")
  const row = await q.getSeedDeletionRow(
    tx,
    `${SEED_DELETE_ID_PREFIX}${digest}`
  )
  if (!row) return "completed"
  if (row.attempts >= 20) return "failed"
  return "pending"
}
