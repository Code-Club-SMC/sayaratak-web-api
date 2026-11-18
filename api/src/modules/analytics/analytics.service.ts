import type { EventType, ListingAnalytics } from "@sayaratak/shared/schemas/api"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import type { eventInputSchema } from "@sayaratak/shared/schemas/inputs"
import type { z } from "zod"

import { db } from "~/shared/db/client"
import { type Transaction, transaction } from "~/shared/db/tx"
import { clock } from "~/shared/time/clock"
import { dayOf, hourOf } from "~/shared/time/khartoum"
import * as ads from "~/modules/ads/ads.service"
import type { SessionUser } from "~/modules/auth/auth.types"
import * as businesses from "~/modules/businesses/businesses.service"
import * as listings from "~/modules/listings/listings.stats.service"
import { isPreviewListing } from "~/modules/listings/listings.seed.service"
import { isPreviewBusiness } from "~/modules/businesses/businesses.seed.service"

import {
  bucket,
  countsPerDay,
  hourlySinceOf,
  pick,
  total,
  type Window,
  windowsOf,
} from "./analytics.period"
import * as hourly from "./analytics.hourly.queries"
import * as q from "./analytics.queries"

type EventInput = z.output<typeof eventInputSchema>

/**
 * Counts one view or click on a listing, business, banner or campaign, in the
 * target's own counter and in the day's and the hour's event rows. An id that names none of
 * them is ignored, so a stranger cannot grow the table with made-up ids.
 */
export async function recordEvent(event: EventInput) {
  await transaction(async (tx) => {
    if (!(await countOnTarget(tx, event))) return
    const now = clock.now()
    const row = { day: dayOf(now), targetId: event.targetId, type: event.type }
    await q.bumpEvent(tx, row)
    await hourly.bumpHourly(tx, { ...row, hour: hourOf(now) })
  })
}

/** Deletes the view and click counters of a business that is going away. */
export async function deleteEventsOf(tx: Transaction, targetId: string) {
  await q.deleteOfTarget(tx, targetId)
}

/** One listing's counters per bucket and in total for the period, for its owner or an admin. */
export async function getListingAnalytics(
  user: SessionUser,
  target: { id: string; query: PeriodQuery }
): Promise<ListingAnalytics> {
  const favorites = await listings.getFavoritesOfEditable(db, {
    user,
    id: target.id,
  })
  const { period, current, compare, align, compareStarts } = windowsOf(
    target.query
  )
  const read = async (w: Window, fit: (v: number[]) => number[]) => {
    const byDay = await countsPerDay([target.id], w, period)
    const [views, phoneClicks, whatsappClicks, shares] = (
      ["views", "phoneClicks", "whatsappClicks", "shares"] as const
    ).map((key) => fit(bucket(w, pick(byDay, key))))
    return { views, phoneClicks, whatsappClicks, shares }
  }
  const series = (r: Awaited<ReturnType<typeof read>>, starts: string[]) =>
    starts.map((day, i) => ({
      day,
      views: r.views?.[i] ?? 0,
      phoneClicks: r.phoneClicks?.[i] ?? 0,
      whatsappClicks: r.whatsappClicks?.[i] ?? 0,
    }))
  const same = (v: number[]) => v
  const [now, before, hourlySince] = await Promise.all([
    read(current, same),
    read(compare, align),
    hourlySinceOf(current.today),
  ])
  return {
    period,
    hourlySince,
    totals: {
      views: total(now.views ?? []),
      phoneClicks: total(now.phoneClicks ?? []),
      whatsappClicks: total(now.whatsappClicks ?? []),
      shares: total(now.shares ?? []),
      favorites,
    },
    series: series(now, current.starts),
    previousSeries: series(before, compareStarts),
    top: [],
  }
}

async function countOnTarget(tx: Transaction, event: EventInput) {
  const { type, targetId } = event
  if (
    (await isPreviewListing(tx, targetId)) ||
    (await isPreviewBusiness(tx, targetId))
  )
    return false
  if (isAdEvent(type))
    return ads.countAdEvent(tx, {
      targetId,
      counter: type === "banner_click" ? "clicks" : "impressions",
    })
  return (
    (await listings.countListingEvent(tx, { id: targetId, type })) ||
    businesses.hasBusiness(tx, targetId)
  )
}

function isAdEvent(type: EventType) {
  return type === "banner_click" || type === "banner_view"
}
