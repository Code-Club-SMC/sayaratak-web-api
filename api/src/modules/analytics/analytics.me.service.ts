import type { Period, PeriodQuery } from "@sayaratak/shared/schemas/period"
import type { Analytics } from "@sayaratak/shared/schemas/responses"

import { db } from "~/shared/db/client"
import type { SessionUser } from "~/modules/auth/auth.types"
import * as businesses from "~/modules/businesses/businesses.service"
import * as favorites from "~/modules/favorites/favorites.service"
import * as listings from "~/modules/listings/listings.stats.service"
import * as messaging from "~/modules/messaging/messaging.service"
import * as reviews from "~/modules/reviews/reviews.service"

import { sumCounts } from "./analytics.mapper"
import {
  bucket,
  countsPerDay,
  pick,
  total,
  type Window,
  windowsOf,
} from "./analytics.period"
import * as q from "./analytics.queries"

const TOP_COUNT = 10

/**
 * The dashboard numbers for the signed-in account: a seller's listings, a
 * business owner's profile page, everything for an admin. `previous` and
 * `previousDaily` are the compare window (the period before, or a year
 * earlier), bucketed like the current one.
 */
export async function getMyAnalytics(
  user: SessionUser,
  query: PeriodQuery
): Promise<Analytics> {
  const { period, current, compare, align, compareStarts } = windowsOf(query)
  const scope = await scopeOf(user)
  const read = (w: Window) => readWindow({ user, scope, w, period })
  const [now, before] = await Promise.all([read(current), read(compare)])
  return {
    period,
    totals: now.totals,
    previous: before.totals,
    daily: bucketsOf(now.series, current.starts),
    previousDaily: bucketsOf(before.series, compareStarts, align),
    topListings:
      user.role === "dealership" ? await topListings(scope, current) : [],
  }
}

// The four series and six totals of one window.
async function readWindow(input: {
  user: SessionUser
  scope: Scope
  w: Window
  period: Period
}) {
  const { user, scope, w, period } = input
  const [byDay, received, newFavorites, newReviews] = await Promise.all([
    countsPerDay(scope.targets, w, period),
    messaging.countReceivedPerDay(db, scope.admin ? null : user.id, w),
    favorites.countNewFavorites(db, scope.listingIds, w),
    reviews.countNewReviews(db, scope.businessIds, w),
  ])
  const series = {
    views: bucket(w, pick(byDay, "views")),
    calls: bucket(w, pick(byDay, "phoneClicks")),
    whatsapp: bucket(w, pick(byDay, "whatsappClicks")),
    messages: bucket(w, received),
  }
  return {
    series,
    totals: {
      views: total(series.views),
      calls: total(series.calls),
      whatsapp: total(series.whatsapp),
      messages: total(series.messages),
      favorites: newFavorites,
      newReviews,
    },
  }
}

type Series = Awaited<ReturnType<typeof readWindow>>["series"]

// One row per bucket; `fit` lines a compare window up with the current one.
function bucketsOf(
  series: Series,
  starts: string[],
  fit: (values: number[]) => number[] = (values) => values
) {
  const [views, calls, whatsapp, messages] = [
    series.views,
    series.calls,
    series.whatsapp,
    series.messages,
  ].map(fit)
  return starts.map((date, i) => ({
    date,
    views: views?.[i] ?? 0,
    calls: calls?.[i] ?? 0,
    whatsapp: whatsapp?.[i] ?? 0,
    messages: messages?.[i] ?? 0,
  }))
}

// Which ids count for the account. `null` means everything (an admin).
async function scopeOf(user: SessionUser) {
  if (user.role === "admin")
    return { admin: true, listingIds: null, businessIds: null, targets: null }
  const [listingIds, businessId] = await Promise.all([
    listings.listIdsOf(db, user.id),
    businesses.getBusinessIdOf(db, user.id),
  ])
  const businessIds = businessId ? [businessId] : []
  return {
    admin: false,
    listingIds,
    businessIds,
    targets: [...listingIds, ...businessIds],
  }
}

type Scope = Awaited<ReturnType<typeof scopeOf>>

// A dealership's listings with the most views in the window, most first.
async function topListings(scope: Scope, days: Window) {
  const ids = scope.listingIds ?? []
  if (ids.length === 0) return []
  const rows = await q.listTargetCounts(db, ids, days)
  const counts = ids.map((id) => {
    const sum = sumCounts(rows.filter((row) => row.targetId === id))
    return {
      id,
      views: sum.views,
      contacts: sum.phoneClicks + sum.whatsappClicks,
    }
  })
  // Ties keep id order: the sort is stable.
  const top = counts.sort((a, b) => b.views - a.views).slice(0, TOP_COUNT)
  const cards = await listings.listCards(
    db,
    top.map((item) => item.id)
  )
  return cards.map((card, i) => ({
    ...card,
    views: top[i]?.views ?? 0,
    contacts: top[i]?.contacts ?? 0,
  }))
}
