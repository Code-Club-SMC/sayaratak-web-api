import { eq, sql } from "drizzle-orm"

import type { Executor } from "~/shared/db/tx"

import { banners, campaigns } from "./ads.tables"

type Counter = "impressions" | "clicks"

/** Adds one to the banner's counter; false when there is no such banner. */
export async function bumpBanner(ex: Executor, id: string, counter: Counter) {
  const rows = await ex
    .update(banners)
    .set({ [counter]: sql`${banners[counter]} + 1` })
    .where(eq(banners.id, id))
    .returning({ id: banners.id })
  return rows.length > 0
}

/** Adds one to the campaign's counter; false when there is no such campaign. */
export async function bumpCampaign(ex: Executor, id: string, counter: Counter) {
  const rows = await ex
    .update(campaigns)
    .set({ [counter]: sql`${campaigns[counter]} + 1` })
    .where(eq(campaigns.id, id))
    .returning({ id: campaigns.id })
  return rows.length > 0
}

export function getCampaign(ex: Executor, id: string) {
  return ex
    .select({
      ownerId: campaigns.ownerId,
      status: campaigns.status,
      amount: campaigns.amount,
      weeks: campaigns.weeks,
    })
    .from(campaigns)
    .where(eq(campaigns.id, id))
    .then(([row]) => row)
}

/** Back to review after a new receipt: the old rejection reason no longer applies. */
export function updateUnderReview(ex: Executor, id: string) {
  return ex
    .update(campaigns)
    .set({ status: "under_review", rejectionReason: null })
    .where(eq(campaigns.id, id))
}
