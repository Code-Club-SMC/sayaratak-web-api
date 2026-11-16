import type { SeedAssetBinding } from "@sayaratak/shared/schemas/seed-batches"
import { and, eq } from "drizzle-orm"
import sharp from "sharp"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { transaction } from "~/shared/db/tx"
import { checkSeedImage } from "~/shared/files/image-check"
import { clock } from "~/shared/time/clock"
import { user } from "~/modules/auth/auth.tables"
import { insertSeedOwners } from "~/modules/auth/auth.seed.service"
import { insertSeedBusinesses } from "~/modules/businesses/businesses.seed.service"
import { insertSeedListings } from "~/modules/listings/listings.seed.service"
import {
  seedImageKey,
  storeSeedImage,
} from "~/modules/uploads/uploads.seed.service"
import {
  seedAssets,
  seedRecords,
  seedStorageIntents,
} from "~/modules/admin-seed/admin-seed.assets.tables"
import { recordSeedOwnership } from "~/modules/admin-seed/admin-seed.references.service"
import { prepareSeedDataset } from "~/modules/admin-seed/admin-seed.service"
import { seedDatasets } from "~/modules/admin-seed/admin-seed.tables"

/** Uses the real manifest and real image decoder, with only external file storage faked. */
export async function seedPreviewFixture(): Promise<{
  listingId: string
  businessId: string
  datasetId: string
}> {
  const prepared = await prepareSeedAssets(false)
  const listing = prepared.dataset.manifest.records.find(
    (record) => record.kind === "vehicle"
  )
  const business = prepared.dataset.manifest.records.find(
    (record) =>
      record.kind === "dealership" && record.ownerId === listing?.ownerId
  )
  const owner = prepared.dataset.manifest.owners.find(
    (record) => record.id === listing?.ownerId
  )
  if (listing?.kind !== "vehicle" || business?.kind !== "dealership" || !owner)
    throw new Error("the real manifest must contain dealership inventory")
  const base = {
    datasetId: prepared.dataset.id,
    manifestDigest: prepared.dataset.manifestDigest,
    anchor: prepared.dataset.createdAt.toISOString(),
  }
  await transaction(async (tx) => {
    await insertSeedOwners(tx, { ...base, owners: [owner] })
    await insertSeedBusinesses(tx, {
      ...base,
      records: [business],
      bindings: prepared.bindings.filter(
        (binding) => binding.recordId === business.id
      ),
    })
    await insertSeedListings(tx, {
      ...base,
      records: [listing],
      bindings: prepared.bindings.filter(
        (binding) => binding.recordId === listing.id
      ),
    })
    for (const [domain, record] of [
      ["owner", owner],
      ["dealership", business],
      ["listing", listing],
    ] as const)
      await recordSeedOwnership(tx, {
        datasetId: base.datasetId,
        domain,
        record,
        at: prepared.dataset.createdAt,
      })
  })
  return {
    listingId: listing.id,
    businessId: business.id,
    datasetId: base.datasetId,
  }
}

/** Prepares either four fixture images or all 460 accepted assets without changing the manifest. */
export async function prepareSeedAssets(full: boolean) {
  if (env.NODE_ENV !== "test" || env.DATABASE_URL !== Bun.env.TEST_DATABASE_URL)
    throw new Error("admin seed fixtures require the isolated test database")
  const [admin] = await db.select().from(user).where(eq(user.id, "u-admin"))
  if (!admin) throw new Error("resetDb must install the test admin first")
  const enabled = env.ADMIN_SEED_ENABLED
  env.ADMIN_SEED_ENABLED = true
  try {
    await prepareSeedDataset({ admin, ip: "127.0.0.1" })
  } finally {
    env.ADMIN_SEED_ENABLED = enabled
  }
  const [dataset] = await db
    .select()
    .from(seedDatasets)
    .where(eq(seedDatasets.liveSlot, true))
  if (!dataset) throw new Error("dataset preparation failed")
  const first = dataset.manifest.records.find(
    (record) => record.kind === "vehicle"
  )
  const business = dataset.manifest.records.find(
    (record) =>
      record.kind === "dealership" && record.ownerId === first?.ownerId
  )
  const assets = dataset.manifest.assets.filter(
    (asset) =>
      full || asset.recordId === first?.id || asset.recordId === business?.id
  )
  const bytes = new Uint8Array(
    await sharp({
      create: { width: 1600, height: 1200, channels: 3, background: "#426451" },
    })
      .jpeg()
      .toBuffer()
  )
  const checked = await checkSeedImage(bytes)
  const bindings: SeedAssetBinding[] = []
  for (const asset of assets) {
    const intent = {
      datasetId: dataset.id,
      operationId: "fixture-images",
      assetId: asset.id,
      generation: 1,
      inputDigest: checked.digest,
      normalizedDigest: checked.digest,
      bytes,
      mime: checked.mime,
      width: checked.width,
      height: checked.height,
    }
    const key = seedImageKey(intent)
    const stored = await storeSeedImage({ ...intent, immutableKey: key })
    const binding = {
      assetId: asset.id,
      recordId: asset.recordId,
      position: asset.position,
      generation: 1,
      uploadId: stored.uploadId,
      providerId: stored.immutableKey,
      inputDigest: checked.digest,
    }
    await registerFixtureAsset({ datasetId: dataset.id, binding, checked, key })
    bindings.push(binding)
  }
  return { dataset, bindings, actor: { admin, ip: "127.0.0.1" } }
}

async function registerFixtureAsset(input: {
  datasetId: string
  binding: SeedAssetBinding
  checked: Awaited<ReturnType<typeof checkSeedImage>>
  key: string
}) {
  const { datasetId, binding, checked, key } = input
  await transaction(async (tx) => {
    await tx
      .update(seedAssets)
      .set({
        accepted: true,
        state: "stored",
        inputDigest: checked.digest,
        bytes: checked.bytes,
        width: checked.width,
        height: checked.height,
        mime: checked.mime,
        uploadId: binding.uploadId,
        providerId: key,
      })
      .where(
        and(
          eq(seedAssets.datasetId, datasetId),
          eq(seedAssets.assetId, binding.assetId),
          eq(seedAssets.generation, 1)
        )
      )
    await tx.insert(seedRecords).values({
      datasetId,
      domain: "upload",
      recordId: binding.uploadId,
      recordDigest: checked.digest,
      createdAt: clock.now(),
    })
    await tx.insert(seedStorageIntents).values({
      id: `fixture-${binding.assetId}`,
      datasetId,
      assetId: binding.assetId,
      generation: 1,
      provider: "cloudinary",
      objectKey: key,
      digest: checked.digest,
      purpose: "image",
      state: "stored",
      createdAt: clock.now(),
    })
  })
}
