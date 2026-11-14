import {
  seedStatusSchema,
  type SeedStatus,
} from "@sayaratak/shared/schemas/admin-seed"
import { seedManifestSchema } from "@sayaratak/shared/schemas/seed-manifest"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import { newId } from "~/shared/text/ids"
import { clock } from "~/shared/time/clock"
import { recordAudit } from "~/modules/audit/audit.service"
import type { Actor } from "~/modules/audit/audit.types"

import * as assets from "./admin-seed.assets.queries"
import { getSeedCapability } from "./admin-seed.capability.service"
import {
  buildSeedManifest,
  getManifestDigest,
} from "./admin-seed.catalog.service"
import { toSeedDataset, toSeedOperation } from "./admin-seed.mapper"
import * as operations from "./admin-seed.operations.queries"
import { renderSeedPromptPack } from "./admin-seed.prompts.service"
import * as q from "./admin-seed.queries"
import { checkSeedTaxonomy } from "./admin-seed.taxonomy.service"

/** Returns durable state and capability names, never storage credentials or owner identities. */
export async function getSeedStatus(): Promise<SeedStatus> {
  const manifest = buildSeedManifest()
  const dataset = (await q.getLiveDataset(db)) ?? (await q.getLatestDataset(db))
  const operation = dataset
    ? ((await operations.getActiveOperation(db, dataset.id)) ??
      (await operations.getLatestOperation(db, dataset.id)))
    : undefined
  const counts = dataset
    ? await assets.countAssetStates(db, dataset.id)
    : { accepted: 0, rejected: 0 }
  return seedStatusSchema.parse({
    capability: getSeedCapability(env),
    catalog: {
      version: manifest.version,
      manifestDigest: getManifestDigest(manifest),
      listings: 200,
      businesses: 30,
      images: 460,
    },
    dataset: dataset ? toSeedDataset(dataset) : null,
    operation: operation ? toSeedOperation(operation) : null,
    assets: { ...counts, missing: 460 - counts.accepted },
  })
}

/** Creates the one prepared catalog atomically, or returns the same existing preparation. */
export async function prepareSeedDataset(actor: Actor): Promise<SeedStatus> {
  requireCapability()
  const manifest = buildSeedManifest()
  const manifestDigest = getManifestDigest(manifest)
  await transaction(async (tx) => {
    await q.lockPreparation(tx)
    const existing = await q.getLiveDataset(tx)
    if (existing) {
      checkStoredManifest(existing)
      if (existing.manifestDigest !== manifestDigest) fail.conflict()
      return
    }
    await checkSeedTaxonomy(tx, manifest)
    const now = clock.now()
    const dataset = await q.insertDataset(tx, {
      id: newId("sd"),
      version: manifest.version,
      manifest,
      manifestDigest,
      createdBy: actor.admin.id,
      createdAt: now,
      updatedAt: now,
    })
    if (!dataset) fail.conflict()
    await assets.insertExpectedAssets(tx, {
      datasetId: dataset.id,
      manifest,
      at: now,
    })
    await recordAudit(tx, actor, {
      action: "seed.prepare",
      targetType: "seed",
      targetId: dataset.id,
      after: {
        manifestDigest,
        records: manifest.records.length,
        images: manifest.assets.length,
      },
    })
  })
  return getSeedStatus()
}

/** Downloads exactly the persisted manifest, not an unapproved freshly rebuilt replacement. */
export async function getSeedPromptPack() {
  requireCapability()
  const dataset = await q.getLiveDataset(db)
  if (!dataset) fail.notFound()
  const manifest = checkStoredManifest(dataset)
  return renderSeedPromptPack(manifest)
}

function requireCapability() {
  if (!getSeedCapability(env).enabled) fail.forbidden()
}

function checkStoredManifest(
  dataset: NonNullable<Awaited<ReturnType<typeof q.getLiveDataset>>>
) {
  const parsed = seedManifestSchema.safeParse(dataset.manifest)
  if (!parsed.success) fail.conflict()
  if (getManifestDigest(parsed.data) !== dataset.manifestDigest) fail.conflict()
  return parsed.data
}
