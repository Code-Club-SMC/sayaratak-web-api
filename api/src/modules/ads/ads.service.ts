import type { Executor, Transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"

import { lockRoom } from "./ads.pages.service"
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

/**
 * A campaign holds its slots from the moment its receipt is sent, so the
 * pages are checked again then (the pages may have filled since it was
 * booked): 409 `page_full` when one has no free slot left. The pages stay
 * held until the transaction ends, so the receipt that follows cannot lose
 * the slot to another.
 */
export async function assertCampaignRoom(tx: Transaction, id: string) {
  const campaign = await q.getCampaign(tx, id)
  if (!campaign) fail.notFound()
  await lockRoom(tx, { ...campaign, except: id })
}
