import { db } from "~/shared/db/client"
import { transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { clock } from "~/shared/time/clock"
import { recordAudit, recordSystemAudit } from "~/modules/audit/audit.service"
import type { Actor } from "~/modules/audit/audit.types"

import {
  checkInstallManifest,
  installCheckpointSchema,
} from "./admin-seed.install-state.service"
import * as q from "./admin-seed.install.queries"
import { toSeedOperation } from "./admin-seed.mapper"

/** Keeps failed install progress durable and sanitizes worker errors for the admin. */
export async function failSeedInstall(
  operationId: string,
  code: "seed_install_conflict" | "seed_install_failed"
) {
  const initial = await q.getInstallOperation(db, operationId)
  if (initial?.kind !== "seed") fail.notFound()
  await transaction(async (tx) => {
    await q.lockInstallDataset(tx, initial.datasetId)
    const operation = await q.lockInstallOperation(tx, operationId)
    if (!operation || operation.supersededBy || operation.state === "completed")
      return
    await q.updateInstallOperation(tx, {
      id: operation.id,
      set: { state: "failed", errorCode: code, updatedAt: clock.now() },
    })
    await recordSystemAudit(tx, {
      action: "seed.failed",
      targetType: "seed",
      targetId: initial.datasetId,
      reason: code,
      after: { operationId, completed: operation.completed },
    })
  })
}

/** Requeues the same unsuperseded install without resetting committed counters. */
export async function retrySeedInstall(
  actor: Actor,
  input: {
    operationId: string
    manifestDigest: string
  }
) {
  const initial = await q.getInstallOperation(db, input.operationId)
  if (initial?.kind !== "seed") fail.notFound()
  return transaction(async (tx) => {
    const dataset = await q.lockInstallDataset(tx, initial.datasetId)
    const operation = await q.lockInstallOperation(tx, initial.id)
    if (
      !dataset ||
      !operation ||
      !canRetryInstall(dataset, operation, input.manifestDigest)
    )
      fail.conflict()
    checkInstallManifest(dataset)
    installCheckpointSchema.parse(operation.checkpoint)
    await q.updateInstallOperation(tx, {
      id: operation.id,
      set: { state: "queued", errorCode: null, updatedAt: clock.now() },
    })
    await recordAudit(tx, actor, {
      action: "seed.retry",
      targetType: "seed",
      targetId: dataset.id,
      after: { operationId: operation.id, completed: operation.completed },
    })
    return toSeedOperation({ ...operation, state: "queued", errorCode: null })
  })
}

function canRetryInstall(
  dataset: Parameters<typeof checkInstallManifest>[0],
  operation: Parameters<typeof toSeedOperation>[0],
  digest: string
) {
  if (dataset.manifestDigest !== digest || dataset.state !== "seeding")
    return false
  if (
    operation.supersededBy ||
    operation.activeSlot !== true ||
    operation.state !== "failed"
  )
    return false
  return true
}
