import { db } from "~/shared/db/client"
import { checkSeedImage } from "~/shared/files/image-check"
import { openSeedArchive, type SeedArchive } from "~/shared/files/zip"
import { fail } from "~/shared/http/errors"
import { seedArchives } from "~/shared/storage/seed-archives"
import {
  seedImageKey,
  storeSeedImage,
} from "~/modules/uploads/uploads.seed.service"

import { acceptSeedArchive } from "./admin-seed.accept.service"
import {
  archiveCheckpointSchema,
  type ArchiveCheckpoint,
  type ValidatedArchiveEntry,
} from "./admin-seed.archive.types"
import * as q from "./admin-seed.media.queries"
import {
  commitSeedImage,
  reserveMediaIntent,
} from "./admin-seed.media-state.service"
import * as work from "./admin-seed.work.queries"
import type { SeedOperationRow } from "./admin-seed.operations.queries"

export { acceptSeedArchive } from "./admin-seed.accept.service"
const MEDIA_PASS_SIZE = 5

/** Stores at most five validated archive images and counts only durable storage commits. */
export async function processSeedMedia(operationId: string): Promise<number> {
  const operation = await loadMediaOperation(operationId)
  if (operation.state === "completed") return 0
  const checkpoint = archiveCheckpointSchema.parse(operation.checkpoint)
  const images = await q.listMediaImages(db, {
    datasetId: operation.datasetId,
    assetIds: checkpoint.entries.map((entry) => entry.assetId),
  })
  // With pending [a,b,c,d,e,f], this pass stores a-e; acceptance waits for f.
  const pending = pendingEntries(checkpoint, images).slice(0, MEDIA_PASS_SIZE)
  if (!pending.length) {
    await acceptSeedArchive(operationId)
    return 0
  }
  const archive = await openCheckedArchive(checkpoint)
  const stored = await storeArchiveEntries(archive, { operation, pending })
  if (stored !== pending.length) fail.conflict()
  const committed = await q.listMediaImages(db, {
    datasetId: operation.datasetId,
    assetIds: checkpoint.entries.map((entry) => entry.assetId),
  })
  if (!pendingEntries(checkpoint, committed).length)
    await acceptSeedArchive(operationId)
  return stored
}

async function loadMediaOperation(operationId: string) {
  const operation = await work.getWorkOperation(db, operationId)
  if (!operation) fail.notFound()
  if (operation.state === "completed") return operation
  if (
    operation.kind !== "archive" ||
    operation.stage !== "store-images" ||
    !["queued", "running"].includes(operation.state) ||
    operation.supersededBy
  )
    fail.conflict()
  return operation
}

function pendingEntries(
  checkpoint: ArchiveCheckpoint,
  images: Awaited<ReturnType<typeof q.listMediaImages>>
) {
  return checkpoint.entries.filter(
    (entry) =>
      !images.some(
        (image) =>
          image.assetId === entry.assetId &&
          image.generation === entry.generation &&
          image.inputDigest === entry.digest &&
          image.state === "stored"
      )
  )
}

async function storeArchiveEntries(
  archive: SeedArchive,
  input: { operation: SeedOperationRow; pending: ValidatedArchiveEntry[] }
) {
  let stored = 0
  try {
    for await (const entry of archive.entries()) {
      const expected = input.pending.find(
        (image) => image.filename === entry.filename
      )
      if (!expected) continue
      const bytes = await entry.read()
      const checked = await checkSeedImage(bytes)
      if (
        checked.digest !== expected.digest ||
        checked.mime !== expected.mime ||
        checked.width !== expected.width ||
        checked.height !== expected.height
      )
        fail.conflict()
      await storeMediaEntry(input.operation, { expected, bytes })
      stored += 1
    }
  } finally {
    archive.close()
  }
  return stored
}

async function openCheckedArchive(checkpoint: ArchiveCheckpoint) {
  const bytes = await seedArchives.download(checkpoint.archiveKey)
  const digest = new Bun.CryptoHasher("sha256").update(bytes).digest("hex")
  if (
    digest !== checkpoint.archiveDigest ||
    bytes.length !== checkpoint.archiveBytes
  )
    fail.conflict()
  return openSeedArchive(bytes)
}

async function storeMediaEntry(
  operation: SeedOperationRow,
  input: { expected: ValidatedArchiveEntry; bytes: Uint8Array<ArrayBuffer> }
) {
  const { expected, bytes } = input
  const intent = {
    datasetId: operation.datasetId,
    operationId: operation.id,
    assetId: expected.assetId,
    generation: expected.generation,
    inputDigest: expected.digest,
    normalizedDigest: expected.digest,
    bytes,
    mime: expected.mime,
    width: expected.width,
    height: expected.height,
  }
  const immutableKey = seedImageKey(intent)
  await reserveMediaIntent({ ...intent, immutableKey })
  const stored = await storeSeedImage({ ...intent, immutableKey })
  await commitSeedImage({ ...intent, immutableKey }, stored)
}
