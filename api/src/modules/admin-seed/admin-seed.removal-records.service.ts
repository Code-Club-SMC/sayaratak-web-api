import * as authRemoval from "~/modules/auth/auth.seed-removal.service"
import * as businessesRemoval from "~/modules/businesses/businesses.seed-removal.service"
import * as listingsRemoval from "~/modules/listings/listings.seed-removal.service"
import type { Transaction } from "~/shared/db/tx"
import { clock } from "~/shared/time/clock"

import * as qInstall from "./admin-seed.install.queries"
import { resolveTransitiveProtection } from "./admin-seed.protection.service"
import * as qRem from "./admin-seed.removal.queries"

const RECORD_PASS_SIZE = 25

type RemovalBatchContext = {
  datasetId: string
  op: NonNullable<Awaited<ReturnType<typeof qInstall.lockInstallOperation>>>
  protectedIds: Set<string>
}

async function updateRecordOutcomes(
  tx: Transaction,
  meta: { datasetId: string; domain: "listing" | "owner" },
  result: Awaited<ReturnType<typeof listingsRemoval.removeSeedRecords>>
) {
  for (const id of result.deletedIds)
    await qRem.updateRecordOutcome(tx, {
      datasetId: meta.datasetId,
      domain: meta.domain,
      recordId: id,
      outcome: "removed",
    })
  for (const r of result.retained)
    await qRem.updateRecordOutcome(tx, {
      datasetId: meta.datasetId,
      domain: meta.domain,
      recordId: r.id,
      outcome: "retained",
      reason: r.reason,
    })
}

async function removeListingBatch(
  tx: Transaction,
  ctx: RemovalBatchContext,
  items: Array<{ recordId: string }>
) {
  const slice = items.slice(0, RECORD_PASS_SIZE).map((r) => r.recordId)
  const result = await listingsRemoval.removeSeedRecords(tx, {
    datasetId: ctx.datasetId,
    manifestDigest: "",
    orderedOwnedIds: slice,
    orderedProtectedIds: Array.from(ctx.protectedIds),
  })
  await updateRecordOutcomes(
    tx,
    { datasetId: ctx.datasetId, domain: "listing" },
    result
  )
  await qInstall.updateInstallOperation(tx, {
    id: ctx.op.id,
    set: {
      completed: ctx.op.completed + slice.length,
      committedListings: ctx.op.committedListings + result.deletedIds.length,
      retainedRecords: ctx.op.retainedRecords + result.retained.length,
      updatedAt: clock.now(),
    },
  })
  return slice.length
}

type BusinessDomain = "dealership" | "workshop" | "mechanic"

async function removeBusinessBatch(
  tx: Transaction,
  ctx: RemovalBatchContext,
  items: Array<{ domain: BusinessDomain; recordId: string }>
) {
  const slice = items.slice(0, RECORD_PASS_SIZE).map((r) => r.recordId)
  const result = await businessesRemoval.removeSeedRecords(tx, {
    datasetId: ctx.datasetId,
    manifestDigest: "",
    orderedOwnedIds: slice,
    orderedProtectedIds: Array.from(ctx.protectedIds),
  })
  for (const item of items.slice(0, RECORD_PASS_SIZE)) {
    const isRetained = result.retained.some((r) => r.id === item.recordId)
    await qRem.updateRecordOutcome(tx, {
      datasetId: ctx.datasetId,
      domain: item.domain,
      recordId: item.recordId,
      outcome: isRetained ? "retained" : "removed",
      reason: isRetained ? "has_real_references" : undefined,
    })
  }
  await qInstall.updateInstallOperation(tx, {
    id: ctx.op.id,
    set: {
      completed: ctx.op.completed + slice.length,
      committedBusinesses:
        ctx.op.committedBusinesses + result.deletedIds.length,
      retainedRecords: ctx.op.retainedRecords + result.retained.length,
      updatedAt: clock.now(),
    },
  })
  return slice.length
}

async function removeOwnerBatch(
  tx: Transaction,
  ctx: RemovalBatchContext,
  items: Array<{ recordId: string }>
) {
  const slice = items.map((r) => r.recordId)
  const result = await authRemoval.removeSeedRecords(tx, {
    datasetId: ctx.datasetId,
    manifestDigest: "",
    orderedOwnedIds: slice,
    orderedProtectedIds: Array.from(ctx.protectedIds),
  })
  await updateRecordOutcomes(
    tx,
    { datasetId: ctx.datasetId, domain: "owner" },
    result
  )
  return slice.length
}

export async function advanceToMedia(
  tx: Transaction,
  op: NonNullable<Awaited<ReturnType<typeof qInstall.lockInstallOperation>>>
) {
  await qInstall.updateInstallOperation(tx, {
    id: op.id,
    set: { stage: "remove-media", updatedAt: clock.now() },
  })
  return 1
}

function getProtectionScope(
  datasetId: string,
  records: Array<{ domain: string; recordId: string }>,
  uploadIds: string[]
) {
  return {
    datasetId,
    listingIds: records
      .filter((r) => r.domain === "listing")
      .map((r) => r.recordId),
    businessIds: records
      .filter((r) => r.domain !== "listing" && r.domain !== "owner")
      .map((r) => r.recordId),
    ownerIds: records
      .filter((r) => r.domain === "owner")
      .map((r) => r.recordId),
    uploadIds,
  }
}

export async function processRecordsPass(
  tx: Transaction,
  dataset: NonNullable<Awaited<ReturnType<typeof qInstall.lockInstallDataset>>>,
  op: NonNullable<Awaited<ReturnType<typeof qInstall.lockInstallOperation>>>
): Promise<number> {
  const records = await qRem.listOwnedRecordsByDataset(tx, dataset.id)
  const remaining = records.filter((r) => r.outcome === "owned")
  if (!remaining.length) return advanceToMedia(tx, op)
  const uploadIds = await qRem.listAcceptedUploadIds(tx, dataset.id)
  const scope = getProtectionScope(dataset.id, records, uploadIds)
  const protection = await resolveTransitiveProtection(tx, scope)
  const remListings = remaining.filter((r) => r.domain === "listing")
  if (remListings.length)
    return removeListingBatch(
      tx,
      { datasetId: dataset.id, op, protectedIds: protection.protectedListings },
      remListings
    )
  const remBiz = remaining.filter(
    (r): r is typeof r & { domain: BusinessDomain } =>
      r.domain === "dealership" ||
      r.domain === "workshop" ||
      r.domain === "mechanic"
  )
  if (remBiz.length)
    return removeBusinessBatch(
      tx,
      {
        datasetId: dataset.id,
        op,
        protectedIds: protection.protectedBusinesses,
      },
      remBiz
    )
  const remOwners = remaining.filter((r) => r.domain === "owner")
  if (remOwners.length)
    return removeOwnerBatch(
      tx,
      { datasetId: dataset.id, op, protectedIds: protection.protectedOwners },
      remOwners
    )
  return advanceToMedia(tx, op)
}
