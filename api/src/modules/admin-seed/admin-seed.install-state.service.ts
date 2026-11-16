import {
  type SeedAssetBinding,
  seedAssetBindingSchema,
} from "@sayaratak/shared/schemas/seed-batches"
import {
  type SeedManifest,
  type SeedRecord,
  seedManifestSchema,
} from "@sayaratak/shared/schemas/seed-manifest"
import { z } from "zod"

import type { Executor } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { getSeedUploads } from "~/modules/uploads/uploads.seed.service"

import {
  buildSeedManifest,
  getManifestDigest,
} from "./admin-seed.catalog.service"
import * as q from "./admin-seed.install.queries"
import type { SeedDatasetRow } from "./admin-seed.operations.queries"

export const installCheckpointSchema = z.object({
  bindings: z.array(seedAssetBindingSchema).length(460),
  ownersInstalled: z.boolean(),
})

/** Rejects stored-manifest corruption and catalogs other than the approved fixed version. */
export function checkInstallManifest(dataset: SeedDatasetRow) {
  const manifest = seedManifestSchema.parse(dataset.manifest)
  if (
    getManifestDigest(manifest) !== dataset.manifestDigest ||
    dataset.manifestDigest !== getManifestDigest(buildSeedManifest())
  )
    fail.conflict()
  return manifest
}

/** Freezes exact accepted upload generations before queuing any public inserts. */
export async function freezeInstallBindings(
  ex: Executor,
  dataset: SeedDatasetRow
) {
  const manifest = checkInstallManifest(dataset)
  const accepted = await q.listAcceptedAssets(ex, dataset.id)
  if (accepted.length !== manifest.assets.length) fail.conflict()
  const byId = new Map(accepted.map((asset) => [asset.assetId, asset]))
  const bindings = manifest.assets.map((asset) => {
    const stored = byId.get(asset.id)
    if (stored?.state !== "stored") fail.conflict()
    const parsed = seedAssetBindingSchema.safeParse({
      assetId: asset.id,
      recordId: asset.recordId,
      position: asset.position,
      generation: stored.generation,
      uploadId: stored.uploadId,
      providerId: stored.providerId,
      inputDigest: stored.inputDigest,
    })
    if (!parsed.success) fail.conflict()
    return parsed.data
  })
  const uploads = await getSeedUploads(ex, {
    datasetId: dataset.id,
    ids: bindings.map((binding) => binding.uploadId),
  })
  if (
    new Set(bindings.map((binding) => binding.uploadId)).size !==
    bindings.length
  )
    fail.conflict()
  const byUpload = new Map(uploads.map((upload) => [upload.id, upload]))
  if (
    bindings.some(
      (binding) =>
        byUpload.get(binding.uploadId)?.cloudinaryId !== binding.providerId
    )
  )
    fail.conflict()
  return bindings
}

/** Rechecks only this bounded batch against the frozen accepted generations. */
export async function checkFrozenInstallBindings(
  ex: Executor,
  input: {
    datasetId: string
    bindings: SeedAssetBinding[]
  }
) {
  const rows = await q.listInstallAssets(ex, {
    datasetId: input.datasetId,
    assetIds: input.bindings.map((binding) => binding.assetId),
  })
  const byId = new Map(rows.map((row) => [row.assetId, row]))
  if (rows.length !== input.bindings.length) fail.conflict()
  for (const binding of input.bindings) {
    const row = byId.get(binding.assetId)
    if (
      row?.state !== "stored" ||
      row.generation !== binding.generation ||
      row.uploadId !== binding.uploadId ||
      row.providerId !== binding.providerId ||
      row.inputDigest !== binding.inputDigest
    )
      fail.conflict()
  }
}

/** Businesses precede inventory; within each group stable IDs fix lock/replay order. */
export function orderedRecords(manifest: SeedManifest) {
  const businesses = manifest.records.filter(
    (record) => record.kind !== "vehicle" && record.kind !== "part"
  )
  const listings = manifest.records.filter(
    (record) => record.kind === "vehicle" || record.kind === "part"
  )
  return [...businesses.sort(byId), ...listings.sort(byId)]
}

function byId(a: SeedRecord, b: SeedRecord) {
  return a.id.localeCompare(b.id)
}
