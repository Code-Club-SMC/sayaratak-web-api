import type { SeedManifest } from "@sayaratak/shared/schemas/seed-manifest"

import { db } from "~/shared/db/client"
import { transaction } from "~/shared/db/tx"
import { checkSeedImage } from "~/shared/files/image-check"
import { openSeedArchive, type SeedArchiveEntry } from "~/shared/files/zip"
import { ApiError, fail } from "~/shared/http/errors"
import { seedArchives } from "~/shared/storage/seed-archives"
import { clock } from "~/shared/time/clock"

import * as q from "./admin-seed.archive.queries"
import { failSeedArchive } from "./admin-seed.archives.service"
import {
  type ArchiveCheckpoint,
  archiveCheckpointSchema,
  type ValidatedArchiveEntry,
} from "./admin-seed.archive.types"
import type { SeedOperationRow } from "./admin-seed.operations.queries"

const VALIDATION_BATCH_SIZE = 5

/** Fully decodes at most five images and checkpoints without accepting a partial archive. */
export async function processSeedArchiveValidation(
  operationId: string
): Promise<number> {
  const operation = await q.getArchiveOperation(db, operationId)
  if (operation?.kind !== "archive" || operation.stage !== "validate") return 0
  if (
    !["queued", "running"].includes(operation.state) ||
    operation.supersededBy
  )
    return 0
  try {
    return await validateArchivePass(operation)
  } catch (error) {
    const code =
      error instanceof ApiError &&
      error.fields?.archive === "validation.seed_archive_source_expired"
        ? "seed_archive_source_expired"
        : "seed_archive_invalid"
    await failSeedArchive(operationId, code)
    return 0
  }
}

async function validateArchivePass(operation: SeedOperationRow) {
  const checkpoint = archiveCheckpointSchema.parse(operation.checkpoint)
  const context = await transaction(async (tx) => {
    const dataset = await q.lockArchiveDataset(tx)
    if (!dataset || dataset.id !== operation.datasetId) fail.conflict()
    return {
      manifest: dataset.manifest,
      assets: await q.listArchiveAssets(tx, dataset.id),
    }
  })
  const bytes = await seedArchives.download(checkpoint.archiveKey)
  if (bytes.length !== checkpoint.archiveBytes) fail.conflict()
  if (
    new Bun.CryptoHasher("sha256").update(bytes).digest("hex") !==
    checkpoint.archiveDigest
  )
    fail.conflict()
  const archive = await openSeedArchive(bytes)
  try {
    const entries: SeedArchiveEntry[] = []
    for await (const entry of archive.entries()) entries.push(entry)
    checkArchiveNames(entries, { manifest: context.manifest, checkpoint })
    const pending = entries.slice(
      checkpoint.entries.length,
      checkpoint.entries.length + VALIDATION_BATCH_SIZE
    )
    const checked = [...checkpoint.entries]
    for (const entry of pending)
      checked.push(await validateEntry(entry, { ...context, checkpoint }))
    await commitValidation(
      operation,
      { ...checkpoint, entries: checked },
      entries.length
    )
    return pending.length
  } finally {
    archive.close()
  }
}

function checkArchiveNames(
  entries: SeedArchiveEntry[],
  input: {
    manifest: SeedManifest
    checkpoint: ArchiveCheckpoint
  }
) {
  const included = new Set<string>()
  for (const entry of entries) {
    const asset = input.manifest.assets.find((item) =>
      item.allowedFilenames.includes(entry.filename)
    )
    if (!asset) fail.validation({ archive: "validation.seed_archive_filename" })
    included.add(asset.id)
  }
  for (const replacement of input.checkpoint.replaceGenerations)
    if (!included.has(replacement.assetId)) fail.conflict()
}

async function validateEntry(
  entry: SeedArchiveEntry,
  context: {
    manifest: SeedManifest
    assets: Awaited<ReturnType<typeof q.listArchiveAssets>>
    checkpoint: ArchiveCheckpoint
  }
): Promise<ValidatedArchiveEntry> {
  const asset = context.manifest.assets.find((item) =>
    item.allowedFilenames.includes(entry.filename)
  )
  if (!asset) fail.conflict()
  const checked = await checkSeedImage(await entry.read())
  const previous = context.assets.filter((item) => item.assetId === asset.id)
  const accepted = previous.find((item) => item.accepted)
  const replaces = context.checkpoint.replaceGenerations.find(
    (item) => item.assetId === asset.id
  )
  if (
    accepted &&
    accepted.inputDigest !== checked.digest &&
    replaces?.generation !== accepted.generation
  )
    fail.conflict()
  const generation =
    accepted?.inputDigest === checked.digest
      ? accepted.generation
      : Math.max(0, ...previous.map((item) => item.generation)) + 1
  return { assetId: asset.id, filename: entry.filename, generation, ...checked }
}

async function commitValidation(
  operation: SeedOperationRow,
  checkpoint: ArchiveCheckpoint,
  total: number
) {
  await transaction(async (tx) => {
    await q.lockArchiveDataset(tx)
    const current = await q.lockArchiveOperation(tx, operation.id)
    if (
      !current ||
      current.supersededBy ||
      !["queued", "running"].includes(current.state)
    )
      fail.conflict()
    if (
      JSON.stringify(current.checkpoint) !==
      JSON.stringify(operation.checkpoint)
    )
      fail.conflict()
    const done = checkpoint.entries.length === total
    await q.updateArchiveOperation(tx, {
      id: operation.id,
      changes: {
        state: "running",
        stage: done ? "store-images" : "validate",
        completed: done ? 0 : checkpoint.entries.length,
        total,
        checkpoint,
        updatedAt: clock.now(),
      },
    })
  })
}
