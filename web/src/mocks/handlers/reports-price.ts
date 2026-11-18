import {
  buildPriceReport,
  poolOf,
  pricePositionOf,
  type PriceListing,
} from "@sayaratak/shared/lib/price-position"
import {
  pricePositionSchema,
  priceReportQuerySchema,
  priceReportSchema,
} from "@sayaratak/shared/schemas/reports-price"

import { db } from "../db"
import { needUser, route } from "../http"
import { canEditListing, listingById } from "../lib"
import type { ListingRow } from "../types"

// Step 11.7-r7: price position. The rules are the shared builder's, as in the api; this file only gathers its inputs.

const toPrice = (l: ListingRow): PriceListing => ({
  id: l.id,
  ownerUserId: l.ownerUserId,
  kind: l.kind,
  intent: l.intent,
  condition: l.condition,
  makeId: l.makeId,
  modelId: l.modelId,
  year: l.year,
  rentPeriod: l.rentPeriod,
  price: l.price,
  status: l.status,
  expiresAt: l.expiresAt,
  soldAt: l.soldAt ?? null,
})

const market = () =>
  db.listings.filter((l) => l.moderation === "approved").map(toPrice)

route("GET", "/me/reports/price", (c) => {
  const user = needUser(c)
  const query = priceReportQuerySchema.parse(Object.fromEntries(c.query))
  const cards = new Map(
    db.listings
      .filter((l) => l.ownerUserId === user.id)
      .map((l) => {
        const cover = l.media[0]
        return [
          l.id,
          {
            slug: l.slug,
            title: l.title,
            coverUrl:
              (cover?.type === "video" ? cover.posterUrl : cover?.url) ?? null,
          },
        ]
      })
  )
  return priceReportSchema.parse(
    buildPriceReport({
      userId: user.id,
      market: market(),
      cards,
      query,
      now: Date.now(),
    })
  )
})

route("GET", "/listings/:id/price", (c) => {
  const user = needUser(c)
  const row = listingById(c.params.id ?? "")
  canEditListing(user, row)
  return pricePositionSchema.parse(
    pricePositionOf(toPrice(row), poolOf(market(), Date.now()))
  )
})
