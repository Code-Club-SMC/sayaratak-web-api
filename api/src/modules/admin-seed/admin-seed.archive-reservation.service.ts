import type { SeedArchiveInput } from "@sayaratak/shared/schemas/admin-seed"

import { env } from "~/env"
import { transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { seedArchiveKey } from "~/shared/storage/seed-archives"
import { newId } from "~/shared/text/ids"
import { clock } from "~/shared/time/clock"
import { recordAudit } from "~/modules/audit/audit.service"
import type { Actor } from "~/modules/audit/audit.types"

import * as q from "./admin-seed.archive.queries"
import { archiveCheckpointSchema } from "./admin-seed.archive.types"
import { getSeedCapability } from "./admin-seed.capability.service"
import * as operations from "./admin-seed.operations.queries"
import * as storage from "./admin-seed.storage.queries"
import type { SeedOperationRow } from "./admin-seed.operations.queries"

type ArchiveReservation = {
  actor: Actor
  input: SeedArchiveInput
  datasetId: string
  id: string
  key: string
}

/** Reserves the only operation slot and its exact R2 intent before any body is consumed. */
export async function reserveSeedArchive(
  actor: Actor,
  input: SeedArchiveInput
) {
  if (!getSeedCapability(env).enabled) fail.forbidden()
  return transaction(async (tx) => {
    const dataset = await q.lockArchiveDataset(tx)
    if (!dataset) fail.notFound()
    if (!["preparing", "ready"].includes(dataset.state)) fail.conflict()
    if (dataset.manifestDigest !== input.manifestDigest) fail.conflict()
    const archives = await q.listArchiveOperations(tx, dataset.id)
    const replay = findReplay(archives, input)
    if (replay) return { operation: replay, receive: false }
    const current = await operations.getActiveOperation(tx, dataset.id)
    checkSupersession(current, input)
    checkReplacements(await q.listArchiveAssets(tx, dataset.id), input)
    const id = newId("so")
    if (current)
      await supersedeReservation(tx, {
        previousId: current.id,
        nextId: id,
        actor,
      })
    const key = seedArchiveKey({
      datasetId: dataset.id,
      operationId: id,
      digest: input.archiveDigest,
    })
    const operation = await insertReservation(tx, {
      actor,
      input,
      datasetId: dataset.id,
      id,
      key,
    })
    return { operation, receive: true }
  })
}

async function supersedeReservation(
  tx: Parameters<typeof q.updateArchiveOperation>[0],
  input: { previousId: string; nextId: string; actor: Actor }
) {
  await q.updateArchiveOperation(tx, {
    id: input.previousId,
    changes: { activeSlot: null, supersededBy: input.nextId },
  })
  await recordAudit(tx, input.actor, {
    action: "seed.archive.supersede",
    targetType: "seed",
    targetId: input.previousId,
    after: { supersededBy: input.nextId },
  })
}

function findReplay(archives: SeedOperationRow[], input: SeedArchiveInput) {
  return archives.find((row) => {
    const checkpoint = archiveCheckpointSchema.safeParse(row.checkpoint)
    if (
      !checkpoint.success ||
      checkpoint.data.archiveDigest !== input.archiveDigest
    )
      return false
    if (checkpoint.data.archiveBytes !== input.archiveBytes) fail.conflict()
    if (
      JSON.stringify(checkpoint.data.replaceGenerations) !==
      JSON.stringify(input.replaceGenerations)
    )
      fail.conflict()
    return row.state === "completed" && !row.supersededBy
  })
}

function checkSupersession(
  current: SeedOperationRow | undefined,
  input: SeedArchiveInput
) {
  if (!current) {
    if (input.supersedesOperationId) fail.conflict()
    return
  }
  if (current.kind !== "archive" || current.state !== "failed") fail.conflict()
  if (current.id !== input.supersedesOperationId) fail.conflict()
  const previous = archiveCheckpointSchema.parse(current.checkpoint)
  const needsSource =
    current.stage === "upload" ||
    current.errorCode === "seed_archive_source_expired"
  const replacementsChanged =
    JSON.stringify(previous.replaceGenerations) !==
    JSON.stringify(input.replaceGenerations)
  if (
    previous.archiveDigest === input.archiveDigest &&
    !needsSource &&
    !replacementsChanged
  )
    fail.conflict()
}

function checkReplacements(
  assets: Awaited<ReturnType<typeof q.listArchiveAssets>>,
  input: SeedArchiveInput
) {
  const ids = new Set<string>()
  for (const replacement of input.replaceGenerations) {
    if (ids.has(replacement.assetId)) fail.conflict()
    ids.add(replacement.assetId)
    const accepted = assets.find(
      (asset) => asset.assetId === replacement.assetId && asset.accepted
    )
    if (!accepted || accepted.generation !== replacement.generation)
      fail.conflict()
  }
}

async function insertReservation(
  tx: Parameters<typeof storage.insertStorageIntent>[0],
  input: ArchiveReservation
) {
  const now = clock.now()
  const operation = await q.insertArchiveOperation(
    tx,
    reservationRow(input, now)
  )
  if (!operation) fail.conflict()
  await storage.insertStorageIntent(tx, {
    id: newId("si"),
    datasetId: input.datasetId,
    operationId: input.id,
    provider: "r2",
    objectKey: input.key,
    digest: input.input.archiveDigest,
    purpose: "archive",
    createdAt: now,
  })
  await recordAudit(tx, input.actor, {
    action: "seed.archive.start",
    targetType: "seed",
    targetId: input.id,
    after: { archiveBytes: input.input.archiveBytes },
  })
  return operation
}

function reservationRow(
  input: ArchiveReservation,
  now: Date
): Parameters<typeof q.insertArchiveOperation>[1] {
  return {
    id: input.id,
    datasetId: input.datasetId,
    kind: "archive",
    state: "receiving",
    stage: "upload",
    actorId: input.actor.admin.id,
    actorIp: input.actor.ip,
    total: input.input.archiveBytes,
    createdAt: now,
    updatedAt: now,
    checkpoint: {
      archiveKey: input.key,
      archiveDigest: input.input.archiveDigest,
      archiveBytes: input.input.archiveBytes,
      replaceGenerations: input.input.replaceGenerations,
      entries: [],
    },
  }
}
