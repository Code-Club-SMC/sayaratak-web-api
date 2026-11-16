import { and, eq, inArray, isNotNull, notExists } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { seedAssets, seedStorageIntents } from "./admin-seed.assets.tables"
import { seedOperations } from "./admin-seed.tables"

export function listAbandonedImages(ex: Executor, size: number) {
  const accepted = ex
    .select({ id: seedAssets.assetId })
    .from(seedAssets)
    .where(
      and(
        eq(seedAssets.providerId, seedStorageIntents.objectKey),
        eq(seedAssets.accepted, true)
      )
    )
  return ex
    .select({ intent: seedStorageIntents })
    .from(seedStorageIntents)
    .innerJoin(
      seedOperations,
      eq(seedOperations.id, seedStorageIntents.operationId)
    )
    .where(
      and(
        eq(seedStorageIntents.provider, "cloudinary"),
        inArray(seedStorageIntents.state, ["pending", "stored"]),
        isNotNull(seedOperations.supersededBy),
        notExists(accepted)
      )
    )
    .limit(size)
}
