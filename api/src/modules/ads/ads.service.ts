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
