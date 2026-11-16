import type {
  SeedOperation,
  SeedRemovalInput,
} from "@sayaratak/shared/schemas/admin-seed"

import { env } from "~/env"
import { recordAudit } from "~/modules/audit/audit.service"
import type { Actor } from "~/modules/audit/audit.types"
import * as businessesRemoval from "~/modules/businesses/businesses.seed-removal.service"
import * as listingsRemoval from "~/modules/listings/listings.seed-removal.service"
import { db } from "~/shared/db/client"
import { type Transaction, transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { newId } from "~/shared/text/ids"
import { clock } from "~/shared/time/clock"

import { getSeedCapability } from "./admin-seed.capability.service"
import * as qInstall from "./admin-seed.install.queries"
import { toSeedOperation } from "./admin-seed.mapper"
import { getActiveOperation } from "./admin-seed.operations.queries"
import { processMediaPass } from "./admin-seed.removal-media.service"
import { processRecordsPass } from "./admin-seed.removal-records.service"
import * as qRem from "./admin-seed.removal.queries"

function checkRemovalConflict(
  active: Awaited<ReturnType<typeof getActiveOperation>>
) {
  if (active?.kind === "remove" && !active.supersededBy) return active
  if (
    active?.kind === "archive" &&
    (active.state === "receiving" || active.state === "running")
  ) {
    fail.conflict()
  }
  return null
}

async function createRemovalOperation(
  tx: Transaction,
  actor: Actor,
  datasetId: string
) {
  const now = clock.now()
  const op = await qInstall.insertInstallOperation(tx, {
    id: newId("so"),
    datasetId,
    kind: "remove",
    state: "queued",
    stage: "remove-records",
    activeSlot: true,
    actorId: actor.admin.id,
    actorIp: actor.ip,
    total: 230,
    createdAt: now,
    updatedAt: now,
  })
  if (!op) fail.conflict()
  await qInstall.updateInstallDataset(tx, {
    id: datasetId,
    state: "removing",
    at: now,
  })
  await recordAudit(tx, actor, {
    action: "seed.remove",
    targetType: "seed",
    targetId: datasetId,
    after: { operationId: op.id },
  })
  return op
}

/** Atomically hides public records and queues removal, or returns existing removal. */
export async function requestSeedRemoval(
  actor: Actor,
  input: SeedRemovalInput
): Promise<SeedOperation> {
  if (!getSeedCapability(env).enabled) fail.forbidden()
  return transaction(async (tx) => {
    const dataset = await qInstall.lockInstallDataset(tx, input.datasetId)
    if (!dataset || dataset.manifestDigest !== input.manifestDigest)
      fail.conflict()
    const active = await getActiveOperation(tx, dataset.id)
    const existing = checkRemovalConflict(active)
    if (existing) return toSeedOperation(existing)
    if (active) {
      await qRem.supersedeActiveOperations(tx, {
        datasetId: dataset.id,
        supersededBy: "pending-remove",
        at: clock.now(),
      })
    }
    await Promise.all([
      listingsRemoval.hideSeedRecords(tx, dataset.id),
      businessesRemoval.hideSeedRecords(tx, dataset.id),
    ])
    const op = await createRemovalOperation(tx, actor, dataset.id)
    return toSeedOperation(op)
  })
}

function dispatchRemovalPass(
  tx: Transaction,
  dataset: NonNullable<Awaited<ReturnType<typeof qInstall.lockInstallDataset>>>,
  op: NonNullable<Awaited<ReturnType<typeof qInstall.lockInstallOperation>>>
) {
  if (op.stage === "remove-records") return processRecordsPass(tx, dataset, op)
  if (op.stage === "remove-media") return processMediaPass(tx, dataset, op)
  fail.conflict()
}

/** Processes <=25 public records or <=5 media items per pass. */
export async function processSeedRemoval(operationId: string): Promise<number> {
  const initial = await qInstall.getInstallOperation(db, operationId)
  if (initial?.kind !== "remove") fail.notFound()
  return transaction(async (tx) => {
    const dataset = await qInstall.lockInstallDataset(tx, initial.datasetId)
    const op = await qInstall.lockInstallOperation(tx, operationId)
    if (!dataset || !op || op.supersededBy) fail.conflict()
    if (op.state === "completed") return 0
    return dispatchRemovalPass(tx, dataset, op)
  })
}
