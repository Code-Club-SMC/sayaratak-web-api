import type { SeedManifest } from "@sayaratak/shared/schemas/seed-manifest"
import { and, count, countDistinct, eq, notInArray } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { seedAssets } from "./admin-seed.assets.tables"

export function insertExpectedAssets(
  ex: Executor,
  input: { datasetId: string; manifest: SeedManifest; at: Date }
) {
  return ex.insert(seedAssets).values(
    input.manifest.assets.map((asset) => ({
      datasetId: input.datasetId,
      assetId: asset.id,
      filename: asset.filename,
      createdAt: input.at,
    }))
  )
}

export async function countAssetStates(ex: Executor, datasetId: string) {
  const acceptedWhere = and(
    eq(seedAssets.datasetId, datasetId),
    eq(seedAssets.accepted, true)
  )
  const acceptedIds = ex
    .select({ id: seedAssets.assetId })
    .from(seedAssets)
    .where(acceptedWhere)
  // Independent counts: a rejected historical generation does not override an accepted image.
  const [acceptedRows, rejectedRows] = await Promise.all([
    ex.select({ count: count() }).from(seedAssets).where(acceptedWhere),
    ex
      .select({ count: countDistinct(seedAssets.assetId) })
      .from(seedAssets)
      .where(
        and(
          eq(seedAssets.datasetId, datasetId),
          eq(seedAssets.state, "rejected"),
          notInArray(seedAssets.assetId, acceptedIds)
        )
      ),
  ])
  return {
    accepted: acceptedRows[0]?.count ?? 0,
    rejected: rejectedRows[0]?.count ?? 0,
  }
}
