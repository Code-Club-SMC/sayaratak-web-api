import { inArray, or } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { banners, campaigns } from "./ads.tables"

export async function findCampaignReferences(
  tx: Transaction,
  input: { ownerIds: string[]; uploadIds: string[] }
) {
  const conditions = []
  if (input.ownerIds.length) {
    conditions.push(inArray(campaigns.ownerId, input.ownerIds))
  }
  if (input.uploadIds.length) {
    conditions.push(inArray(campaigns.imageUploadId, input.uploadIds))
  }
  if (!conditions.length) return []
  return tx
    .select({
      id: campaigns.id,
      ownerId: campaigns.ownerId,
      imageUploadId: campaigns.imageUploadId,
    })
    .from(campaigns)
    .where(or(...conditions))
}

export async function findBannerUploadReferences(
  tx: Transaction,
  uploadIds: string[]
) {
  if (!uploadIds.length) return []
  return tx
    .select({
      id: banners.id,
      imageArUploadId: banners.imageArUploadId,
      imageEnUploadId: banners.imageEnUploadId,
    })
    .from(banners)
    .where(
      or(
        inArray(banners.imageArUploadId, uploadIds),
        inArray(banners.imageEnUploadId, uploadIds)
      )
    )
}
