import type { PriceListing } from "@sayaratak/shared/lib/price-position"
import type { EventType } from "@sayaratak/shared/schemas/api"

import { fail } from "~/shared/http/errors"
import type { Executor } from "~/shared/db/tx"
import type { SessionUser } from "~/modules/auth/auth.types"

import * as q from "./listings.queries"
import * as statsQ from "./listings.stats.queries"
import { checkCanEdit } from "./listings.rules.service"
import { listByIds } from "./listings.search.queries"
import { toListings } from "./listings.view.service"

const COUNTERS = {
  view: "views",
  phone_click: "phoneClicks",
  whatsapp_click: "whatsappClicks",
} as const

/**
 * Raises the listing's own counter for a view or a click. A share only
 * checks that the listing exists. False when there is no such listing.
 */
export async function countListingEvent(
  ex: Executor,
  event: { id: string; type: EventType }
) {
  const counter = COUNTERS[event.type as keyof typeof COUNTERS]
  if (counter) return q.bumpStat(ex, event.id, counter)
  return q.hasListing(ex, event.id)
}

/** Whether a listing with this id exists, in any state. */
export function hasListing(ex: Executor, id: string) {
  return q.hasListing(ex, id)
}

/** A listing was saved (`1`) or unsaved (`-1`) by this many people more: the saved-by counter follows. */
export function moveFavorites(ex: Executor, ids: string[], delta: 1 | -1) {
  return statsQ.bumpFavorites(ex, ids, delta)
}

/** Ids of every listing the user owns, in id order, whatever their state. */
export function listIdsOf(ex: Executor, ownerUserId: string) {
  return q.listIdsOf(ex, ownerUserId)
}

/**
 * The saved-by count of a listing the user may edit (owner or admin).
 * 404 `not_found`, 403 `forbidden`.
 */
export async function getFavoritesOfEditable(
  ex: Executor,
  target: { user: SessionUser; id: string }
) {
  const row = await q.getListing(ex, target.id)
  if (!row) fail.notFound()
  checkCanEdit(target.user, row)
  const [stats] = await q.listStats(ex, [target.id])
  return stats?.favorites ?? 0
}

/** The listings' id, slug, title and cover picture (a video gives its poster), in the order of `ids`. */
export async function listCards(ex: Executor, ids: string[]) {
  const rows = await listByIds(ex, ids)
  const found = await toListings(ex, rows, null)
  return found.map((listing) => {
    const cover = listing.media[0]
    return {
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      coverUrl:
        (cover?.type === "video" ? cover.posterUrl : cover?.url) ?? null,
    }
  })
}

/**
 * The owner's approved listings as the Listings report reads them (step
 * 11.7-r5): cover, image count, approval time (creation time when none was
 * stamped), end date and sold time.
 */
export async function listReportListings(ex: Executor, ownerUserId: string) {
  const ids = await q.listIdsOf(ex, ownerUserId)
  const rows = (await listByIds(ex, ids)).filter(
    (row) => row.moderation === "approved"
  )
  const found = await toListings(ex, rows, null)
  return found.map((listing, i) => {
    const row = rows[i]
    const cover = listing.media[0]
    return {
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      coverUrl:
        (cover?.type === "video" ? cover.posterUrl : cover?.url) ?? null,
      status: listing.status,
      photos: listing.media.filter((m) => m.type === "image").length,
      liveSince: (row?.decidedAt ?? row?.createdAt ?? new Date()).toISOString(),
      expiresAt: listing.expiresAt,
      soldAt: row?.soldAt?.toISOString() ?? null,
    }
  })
}

/** Approved vehicle listings with a make (the market of the Demand report), with whether each is live at `now`. */
export async function listDemandListings(ex: Executor, now: Date) {
  const rows = await statsQ.listDemandRows(ex)
  return rows.map((row) => ({
    id: row.id,
    ownerUserId: row.ownerUserId,
    makeId: row.makeId ?? "",
    modelId: row.modelId,
    cityId: row.cityId,
    live:
      (row.status === "available" || row.status === "reserved") &&
      row.expiresAt > now,
  }))
}

type PriceRow = Omit<PriceListing, "ownerUserId" | "expiresAt" | "soldAt"> & {
  ownerUserId: string | null
  expiresAt: Date
  soldAt: Date | null
}
const toPriceListing = (row: PriceRow): PriceListing => ({
  id: row.id,
  ownerUserId: row.ownerUserId ?? "",
  kind: row.kind,
  intent: row.intent,
  condition: row.condition,
  makeId: row.makeId,
  modelId: row.modelId,
  year: row.year,
  rentPeriod: row.rentPeriod,
  price: row.price,
  status: row.status,
  expiresAt: row.expiresAt.toISOString(),
  soldAt: row.soldAt?.toISOString() ?? null,
})

/** Approved listings as the price position compares them (step 11.7-r7). */
export async function listPriceListings(ex: Executor) {
  return (await statsQ.listPriceRows(ex)).map(toPriceListing)
}

/**
 * A listing the user may edit (owner or admin), in any state, as the price
 * position reads it. 404 `not_found`, 403 `forbidden`.
 */
export async function getPriceListingOfEditable(
  ex: Executor,
  target: { user: SessionUser; id: string }
) {
  const row = await q.getListing(ex, target.id)
  if (!row) fail.notFound()
  checkCanEdit(target.user, row)
  return toPriceListing(row)
}
