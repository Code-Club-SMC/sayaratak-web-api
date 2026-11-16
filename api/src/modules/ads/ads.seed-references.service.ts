import type {
  SeedReference,
  SeedReferenceScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./ads.seed-references.queries"

export async function getSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const references: SeedReference[] = []
  const uploadIds = scope.uploadIds ?? []
  const campaigns = await q.findCampaignReferences(tx, {
    ownerIds: scope.ownerIds,
    uploadIds,
  })
  for (const c of campaigns) {
    if (c.ownerId && scope.ownerIds.includes(c.ownerId)) {
      references.push({
        referencingDomain: "ads",
        referencingId: c.id,
        referencedDomain: "owner",
        referencedId: c.ownerId,
        reason: "campaign_owned_by_seed_user",
      })
    }
    if (uploadIds.includes(c.imageUploadId)) {
      references.push({
        referencingDomain: "ads",
        referencingId: c.id,
        referencedDomain: "upload",
        referencedId: c.imageUploadId,
        reason: "campaign_uses_upload",
      })
    }
  }
  const banners = await q.findBannerUploadReferences(tx, uploadIds)
  for (const b of banners) {
    const id = uploadIds.includes(b.imageArUploadId)
      ? b.imageArUploadId
      : b.imageEnUploadId
    references.push({
      referencingDomain: "ads",
      referencingId: b.id,
      referencedDomain: "upload",
      referencedId: id,
      reason: "banner_uses_upload",
    })
  }
  return references
}
