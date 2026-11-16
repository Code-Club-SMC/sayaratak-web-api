import type { InteractionMode } from "@sayaratak/shared/schemas/interaction"
import {
  type SeedListingBatch,
  seedListingBatchSchema,
} from "@sayaratak/shared/schemas/seed-batches"

import type { Executor, Transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import * as auth from "~/modules/auth/auth.seed.service"
import * as taxonomy from "~/modules/taxonomy/taxonomy.service"
import {
  attachSeedImages,
  getSeedUploads,
} from "~/modules/uploads/uploads.seed.service"
import { getListingSettings } from "~/modules/content/content.service"

import * as q from "./listings.queries"
import * as seed from "./listings.seed.queries"
import { toSeedListing } from "./listings.seed.mapper"

const DAY_MS = 86_400_000

/** Inserts a bounded batch. The orchestrator owns provenance in this same transaction. */
export async function insertSeedListings(
  tx: Transaction,
  input: SeedListingBatch
) {
  const batch = seedListingBatchSchema.parse(input)
  const settings = await getListingSettings(tx)
  const expiresAt = new Date(
    new Date(batch.anchor).getTime() + settings.listingExpiryDays * DAY_MS
  )
  const ids: string[] = []
  const sorted = [...batch.records].sort((a, b) => a.id.localeCompare(b.id))
  for (const record of sorted) {
    ids.push(await installSeedListing(tx, { record, batch, expiresAt }))
  }
  return ids
}

async function installSeedListing(
  tx: Transaction,
  input: {
    record: SeedListingBatch["records"][number]
    batch: SeedListingBatch
    expiresAt: Date
  }
) {
  const { record, batch, expiresAt } = input
  if (
    !(await auth.isSeedOwner(tx, {
      id: record.ownerId,
      datasetId: batch.datasetId,
    }))
  )
    fail.conflict()
  const row = toSeedListing(batch, record, expiresAt)
  if (await seed.lockSeedListingCollision(tx, row)) fail.conflict()
  await taxonomy.checkPicks(tx, {
    cityId: row.cityId,
    districtId: null,
    makeId: row.makeId ?? null,
    modelId: row.modelId ?? null,
    partCategoryId: row.partCategoryId ?? null,
  })
  const bindings = getListingBindings(batch, record.id)
  await q.insertListing(tx, row)
  await attachListingUploads(tx, {
    datasetId: batch.datasetId,
    ownerUserId: record.ownerId,
    listingId: record.id,
    bindings,
  })
  return record.id
}

function getListingBindings(batch: SeedListingBatch, recordId: string) {
  const bindings = batch.bindings
    .filter((b) => b.recordId === recordId)
    .sort((a, b) => a.position - b.position)
  if (
    bindings.length !== 2 ||
    bindings[0]?.position !== 0 ||
    bindings[1]?.position !== 1
  ) {
    fail.conflict()
  }
  return bindings
}

async function attachListingUploads(
  tx: Transaction,
  input: {
    datasetId: string
    ownerUserId: string
    listingId: string
    bindings: SeedListingBatch["bindings"]
  }
) {
  const { datasetId, ownerUserId, listingId, bindings } = input
  const uploadIds = bindings.map((b) => b.uploadId)
  const uploads = await getSeedUploads(tx, { datasetId, ids: uploadIds })
  if (
    bindings.some(
      (b) =>
        !uploads.some(
          (u) => u.id === b.uploadId && u.cloudinaryId === b.providerId
        )
    )
  ) {
    fail.conflict()
  }
  await attachSeedImages(tx, { datasetId, ownerUserId, ids: uploadIds })
  await q.replaceMedia(tx, { listingId, uploadIds })
}

/** Locks the target before accepting a dependency so removal cannot race it. */
export async function lockListingInteraction(
  ex: Executor,
  id: string
): Promise<InteractionMode> {
  const row = await q.lockListing(ex, id)
  if (!row) fail.notFound()
  return row.seedDatasetId ? "preview" : "live"
}

/** Visible preview rows determine site notice state, not an editable setting. */
export function hasPublicSeedContent(ex: Executor) {
  return seed.hasPublicSeedContent(ex)
}

/** Checks domain ownership before treating durable provenance as replayable. */
export async function isSeedListing(
  ex: Executor,
  ref: { id: string; datasetId: string }
) {
  return (await q.lockListing(ex, ref.id))?.seedDatasetId === ref.datasetId
}

/** Ignores analytics for previews without changing unknown-target behavior. */
export async function isPreviewListing(ex: Executor, id: string) {
  return Boolean((await q.lockListing(ex, id))?.seedDatasetId)
}
