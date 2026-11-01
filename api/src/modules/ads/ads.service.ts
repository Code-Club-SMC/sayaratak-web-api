import type { Executor } from "~/shared/db/tx"

import * as q from "./ads.queries"

/**
 * Counts one view or click on a banner or an advertiser's campaign. Returns
 * false when the id is neither, so the caller can ignore it.
 */
export async function countAdEvent(
  ex: Executor,
  event: { targetId: string; counter: "impressions" | "clicks" }
) {
  const found = await Promise.all([
    q.bumpBanner(ex, event.targetId, event.counter),
    q.bumpCampaign(ex, event.targetId, event.counter),
  ])
  return found.some(Boolean)
}

/** A banner campaign as the checkout needs it, or undefined. */
export function getCampaignToPay(ex: Executor, id: string) {
  return q.getCampaign(ex, id)
}

/** The campaign's receipt was sent: it waits for the admin and its old rejection reason is cleared. */
export async function markCampaignUnderReview(ex: Executor, id: string) {
  await q.updateUnderReview(ex, id)
}
