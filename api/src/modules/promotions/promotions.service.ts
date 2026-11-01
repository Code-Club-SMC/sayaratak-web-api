import type { Listing } from "@sayaratak/shared/schemas/listing"

import type { Executor, Transaction } from "~/shared/db/tx"
import { clock } from "~/shared/time/clock"

import * as q from "./promotions.queries"

/**
 * Ends the running promotions of these listings now. Unpaid ones keep
 * `pending_payment`: they never ran, the `promotions_dates` check needs dates
 * for an ended one, and their receipt is rejected with the account.
 */
export async function endPromotionsOf(tx: Transaction, listingIds: string[]) {
  if (listingIds.length === 0) return
  await q.updateEndedFor(tx, { listingIds, at: clock.now() })
}

/**
 * The promotions running on each listing now, oldest first, as a listing
 * shows them. One whose end has passed is over even before the job marks it
 * (A10). A bump is done at once and never runs.
 */
export async function getRunningOf(ex: Executor, listingIds: string[]) {
  const running = new Map<string, Listing["promotions"]>()
  if (listingIds.length === 0) return running
  const rows = await q.listRunning(ex, { listingIds, now: clock.now() })
  for (const row of rows) {
    if (!row.startsAt || !row.endsAt) continue
    const list = running.get(row.listingId) ?? []
    list.push({
      type: row.type,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
    })
    running.set(row.listingId, list)
  }
  return running
}

/** Listings Featured right now (started, not yet ended): they rank first and fill the home rail. */
export function listFeaturedIds(ex: Executor) {
  return q.listFeaturedIds(ex, clock.now())
}

/** Credit promotions of these listings started since the subscription period began. */
export function countCreditsUsed(
  ex: Executor,
  scope: { listingIds: string[]; since: Date }
) {
  return q.countCreditsSince(ex, scope)
}

/**
 * An order the payer may pay for: the promotion and the price of its type and
 * length (0 when the price row is gone, as the mock). Undefined without such a promotion.
 */
export async function getPromotionToPay(ex: Executor, id: string) {
  const row = await q.getPromotion(ex, id)
  if (!row) return undefined
  return { ...row, price: (await q.getPrice(ex, row)) ?? 0 }
}
