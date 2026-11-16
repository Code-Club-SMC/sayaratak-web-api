import type { SeedAssetBinding } from "@sayaratak/shared/schemas/seed-batches"
import type { SeedManifest } from "@sayaratak/shared/schemas/seed-manifest"

import { db } from "~/shared/db/client"
import { type Transaction, transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { clock } from "~/shared/time/clock"
import * as auth from "~/modules/auth/auth.seed.service"
import * as businesses from "~/modules/businesses/businesses.seed.service"
import * as listings from "~/modules/listings/listings.seed.service"
import { recordSystemAudit } from "~/modules/audit/audit.service"

import {
  checkFrozenInstallBindings,
  checkInstallManifest,
  installCheckpointSchema,
  orderedRecords,
} from "./admin-seed.install-state.service"
import * as q from "./admin-seed.install.queries"
import {
  type OwnedRecord,
  hasOwnedSeedRecord,
  recordSeedOwnership,
} from "./admin-seed.references.service"
import type {
  SeedDatasetRow,
  SeedOperationRow,
} from "./admin-seed.operations.queries"
import { checkSeedTaxonomy } from "./admin-seed.taxonomy.service"

const PUBLIC_BATCH_SIZE = 25
type InstallScope = {
  dataset: SeedDatasetRow
  operation: SeedOperationRow
  manifest: SeedManifest
  bindings: SeedAssetBinding[]
}

/** Commits at most 25 public records and their progress atomically per pass. */
export async function processSeedInstall(operationId: string): Promise<number> {
  const initial = await q.getInstallOperation(db, operationId)
  if (initial?.kind !== "seed") fail.notFound()
  return transaction(async (tx) => {
    const dataset = await q.lockInstallDataset(tx, initial.datasetId)
    const operation = await q.lockInstallOperation(tx, operationId)
    if (!dataset || !operation) fail.conflict()
    if (!canRunInstallPass(dataset, operation)) return 0
    const manifest = checkInstallManifest(dataset)
    const checkpoint = installCheckpointSchema.parse(operation.checkpoint)
    await checkSeedTaxonomy(tx, manifest)
    const scope = {
      dataset,
      operation,
      manifest,
      bindings: checkpoint.bindings,
    }
    if (!checkpoint.ownersInstalled) await installOwners(tx, scope)
    const records = orderedRecords(manifest).slice(
      operation.completed,
      operation.completed + PUBLIC_BATCH_SIZE
    )
    const recordIds = new Set(records.map((record) => record.id))
    await checkFrozenInstallBindings(tx, {
      datasetId: dataset.id,
      bindings: checkpoint.bindings.filter((binding) =>
        recordIds.has(binding.recordId)
      ),
    })
    for (const record of records) await installRecord(tx, { ...scope, record })
    await checkpointInstall(tx, { ...scope, count: records.length })
    return records.length
  })
}

function canRunInstallPass(
  dataset: SeedDatasetRow,
  operation: SeedOperationRow
) {
  if (operation.supersededBy) fail.conflict()
  if (operation.state === "completed") return false
  if (operation.state !== "queued" && operation.state !== "running")
    fail.conflict()
  if (
    operation.stage !== "insert-businesses" &&
    operation.stage !== "insert-listings"
  )
    fail.conflict()
  if (
    operation.total !== 230 ||
    operation.completed !==
      operation.committedBusinesses + operation.committedListings
  )
    fail.conflict()
  if (dataset.state !== "seeding") fail.conflict()
  return true
}

async function installOwners(tx: Transaction, scope: InstallScope) {
  const { dataset, manifest } = scope
  for (const owner of [...manifest.owners].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    const ref = {
      datasetId: dataset.id,
      domain: "owner" as const,
      record: owner,
      at: dataset.createdAt,
    }
    if (await hasOwnedSeedRecord(tx, ref)) continue
    await auth.insertSeedOwners(tx, {
      datasetId: dataset.id,
      manifestDigest: dataset.manifestDigest,
      anchor: dataset.createdAt.toISOString(),
      owners: [owner],
    })
    await recordSeedOwnership(tx, ref)
  }
}

async function installRecord(
  tx: Transaction,
  scope: InstallScope & { record: SeedRecord }
) {
  const { dataset, record } = scope
  const domain: OwnedRecord["domain"] =
    record.kind === "vehicle" || record.kind === "part"
      ? "listing"
      : record.kind
  const ref = { datasetId: dataset.id, domain, record, at: dataset.createdAt }
  if (await hasOwnedSeedRecord(tx, ref)) return
  const batch = {
    datasetId: dataset.id,
    manifestDigest: dataset.manifestDigest,
    anchor: dataset.createdAt.toISOString(),
    bindings: scope.bindings.filter(
      (binding) => binding.recordId === record.id
    ),
  }
  if (record.kind === "vehicle" || record.kind === "part")
    await listings.insertSeedListings(tx, { ...batch, records: [record] })
  else
    await businesses.insertSeedBusinesses(tx, { ...batch, records: [record] })
  await recordSeedOwnership(tx, ref)
}

async function checkpointInstall(
  tx: Transaction,
  scope: InstallScope & { count: number }
) {
  const records = orderedRecords(scope.manifest).slice(
    0,
    scope.operation.completed + scope.count
  )
  const businessCount = records.filter(
    (record) => record.kind !== "vehicle" && record.kind !== "part"
  ).length
  const complete = records.length === scope.manifest.records.length
  const now = clock.now()
  let stage: "complete" | "insert-businesses" | "insert-listings" =
    "insert-listings"
  if (complete) {
    stage = "complete"
  } else if (businessCount < 30) {
    stage = "insert-businesses"
  }
  await q.updateInstallOperation(tx, {
    id: scope.operation.id,
    set: {
      state: complete ? "completed" : "running",
      stage,
      activeSlot: complete ? null : true,
      completed: records.length,
      committedBusinesses: businessCount,
      committedListings: records.length - businessCount,
      checkpoint: { bindings: scope.bindings, ownersInstalled: true },
      updatedAt: now,
    },
  })
  if (!complete) return
  await q.updateInstallDataset(tx, {
    id: scope.dataset.id,
    state: "installed",
    at: now,
  })
  await recordSystemAudit(tx, {
    action: "seed.completed",
    targetType: "seed",
    targetId: scope.dataset.id,
    after: {
      operationId: scope.operation.id,
      listings: records.length - businessCount,
      businesses: businessCount,
    },
  })
}
