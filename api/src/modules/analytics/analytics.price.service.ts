import {
  buildPriceReport,
  isLiveAt,
  poolOf,
  pricePositionOf,
} from "@sayaratak/shared/lib/price-position"
import type {
  PricePosition,
  PriceReport,
  PriceReportQuery,
} from "@sayaratak/shared/schemas/reports-price"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import type { SessionUser } from "~/modules/auth/auth.types"
import * as listings from "~/modules/listings/listings.stats.service"

// Step 11.7-r7. ponytail: reads every approved listing per request, as the Demand report; a per-model price roll-up if the market grows past a few thousand listings.

/** The Price tab: the account's live listings against the middle price of the same car now. */
export async function getPriceReport(
  user: SessionUser,
  query: PriceReportQuery
): Promise<PriceReport> {
  const now = clock.now().getTime()
  const market = await listings.listPriceListings(db)
  const mine = market.filter(
    (l) => l.ownerUserId === user.id && isLiveAt(l, now)
  )
  const cards = await listings.listCards(
    db,
    mine.map((l) => l.id)
  )
  return buildPriceReport({
    userId: user.id,
    market,
    cards: new Map(cards.map((c) => [c.id, c])),
    query,
    now,
  })
}

/** One listing (owner or admin, any state) against the middle price of the same car now. */
export async function getListingPrice(
  user: SessionUser,
  id: string
): Promise<PricePosition> {
  const target = await listings.getPriceListingOfEditable(db, { user, id })
  const market = await listings.listPriceListings(db)
  return pricePositionOf(target, poolOf(market, clock.now().getTime()))
}
