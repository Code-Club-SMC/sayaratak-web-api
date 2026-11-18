import {
  buildDemandReport,
  demandScopeOf,
} from "@sayaratak/shared/lib/demand-report"
import { instantOf } from "@sayaratak/shared/lib/period"
import {
  buildPromotionsReport,
  promotionStretches,
} from "@sayaratak/shared/lib/promotions-report"
import { buildRepliesReport } from "@sayaratak/shared/lib/replies-report"
import { buildReviewsReport } from "@sayaratak/shared/lib/reviews-report"
import { demandReportSchema } from "@sayaratak/shared/schemas/reports-demand"
import { promotionsReportSchema } from "@sayaratak/shared/schemas/reports-promotions"
import { repliesReportSchema } from "@sayaratak/shared/schemas/reports-replies"
import { reviewsReportSchema } from "@sayaratak/shared/schemas/reports-reviews"

import { db } from "../db"
import { needUser, route } from "../http"
import { businessOf } from "../lib"
import { periodOf, windowAt } from "../period"
import type { ListingRow, UserRow } from "../types"

// Step 11.7-r6: the other report tabs. The rules are the shared builders', as in the api; this file only gathers their inputs.

const isLive = (l: ListingRow, now: number) =>
  (l.status === "available" || l.status === "reserved") &&
  Date.parse(l.expiresAt) > now

// Messages others sent in the user's threads about a listing, by listing id.
function receivedIn(user: UserRow, has: (iso: string) => boolean) {
  const threads = new Map(
    db.threads
      .filter(
        (t) => t.subjectType === "listing" && t.participantIds.includes(user.id)
      )
      .map((t) => [t.id, t.subjectId])
  )
  const counts = new Map<string, number>()
  for (const m of db.messages) {
    const id = threads.get(m.threadId)
    if (id && m.senderId !== user.id && has(m.createdAt))
      counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

function countStretch(user: UserRow, id: string, from: string, to: string) {
  if (from >= to) return { views: 0, contacts: 0 }
  const w = windowAt(from, to)
  const only = (t: string) => t === id
  return {
    views: w.events(only, "view").total,
    contacts:
      w.events(only, "phone_click").total +
      w.events(only, "whatsapp_click").total +
      (receivedIn(user, w.has).get(id) ?? 0),
  }
}

route("GET", "/me/reports/promotions", (c) => {
  const user = needUser(c)
  const { period, current } = periodOf(c.query)
  const mine = db.listings.filter(
    (l) => l.ownerUserId === user.id && l.moderation === "approved"
  )
  const cards = new Map(mine.map((l) => [l.id, l]))
  const stretches = promotionStretches({
    period,
    now: Date.now(),
    liveSince: new Map(mine.map((l) => [l.id, l.decidedAt ?? l.createdAt])),
    promotions: db.promotions.flatMap((p) => {
      if (!cards.has(p.listingId) || p.status === "pending_payment") return []
      if (!p.startsAt || !p.endsAt) return []
      const payment = db.payments.find(
        (x) => x.id === p.paymentId && x.status === "approved"
      )
      const price = db.promotionPrices.find(
        (x) => x.type === p.type && x.durationDays === p.durationDays
      )?.price
      return [
        {
          id: p.id,
          listingId: p.listingId,
          type: p.type,
          source: p.source,
          startsAt: p.startsAt,
          endsAt: p.endsAt,
          amount:
            p.source === "paid" ? (payment?.amount ?? price ?? null) : null,
        },
      ]
    }),
  })
  const from = instantOf(period.from)
  const to = instantOf(period.to)
  return promotionsReportSchema.parse(
    buildPromotionsReport({
      period,
      stretches: stretches.map((s) => {
        const l = cards.get(s.promotion.listingId)
        const cover = l?.media[0]
        return {
          ...s,
          card: {
            slug: l?.slug ?? "",
            title: l?.title ?? "",
            coverUrl:
              (cover?.type === "video" ? cover.posterUrl : cover?.url) ?? null,
          },
          beforeCounts: countStretch(
            user,
            s.promotion.listingId,
            s.before,
            s.start
          ),
          duringCounts: countStretch(
            user,
            s.promotion.listingId,
            s.start,
            s.end
          ),
        }
      }),
      campaigns: db.campaigns
        .filter(
          (x) =>
            x.ownerId === user.id &&
            x.status === "approved" &&
            Date.parse(x.startsAt) < to &&
            Date.parse(x.endsAt) > from
        )
        .map((x) => {
          const only = (t: string) => t === x.id
          const views = current.events(only, "banner_view").series
          const clicks = current.events(only, "banner_click").series
          return {
            id: x.id,
            imageUrl: x.creative.imageUrl,
            pages: x.pages,
            startsAt: x.startsAt,
            endsAt: x.endsAt,
            amount: x.amount,
            totalClicks: x.clicks,
            daily: current.starts.map((date, i) => ({
              date,
              impressions: views[i] ?? 0,
              clicks: clicks[i] ?? 0,
            })),
          }
        }),
    })
  )
})

route("GET", "/me/reports/demand", (c) => {
  const user = needUser(c)
  const { period, current } = periodOf(c.query)
  const now = Date.now()
  const all = db.listings
    .filter((l) => l.moderation === "approved" && l.kind === "vehicle")
    .flatMap((l) => (l.makeId ? [{ l, makeId: l.makeId }] : []))
    .sort((a, b) => (a.l.id < b.l.id ? -1 : 1))
  const cityId = businessOf(user)?.row?.cityId ?? null
  const scope = demandScopeOf(
    cityId,
    all.filter(({ l }) => isLive(l, now) && l.cityId === cityId).length
  )
  return demandReportSchema.parse(
    buildDemandReport({
      period,
      scope,
      cityId,
      market: all
        .filter(({ l }) => scope === "country" || l.cityId === cityId)
        .map(({ l, makeId }) => ({
          makeId,
          modelId: l.modelId,
          views: current.events((t) => t === l.id, "view").total,
        })),
      stock: all
        .filter(({ l }) => l.ownerUserId === user.id && isLive(l, now))
        .map(({ l, makeId }) => ({ makeId, modelId: l.modelId })),
    })
  )
})

route("GET", "/me/reports/replies", (c) => {
  const user = needUser(c)
  const { period } = periodOf(c.query)
  const threads = db.threads
    .filter((t) => t.participantIds.includes(user.id))
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .flatMap((t) => {
      const messages = db.messages
        .filter((m) => m.threadId === t.id)
        .sort(
          (a, b) =>
            Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
            (a.id < b.id ? -1 : 1)
        )
        .map((m) => ({ mine: m.senderId === user.id, createdAt: m.createdAt }))
      return messages.length
        ? [{ id: t.id, subjectTitle: t.subjectTitle, messages }]
        : []
    })
  return repliesReportSchema.parse(
    buildRepliesReport({ period, threads, now: Date.now() })
  )
})

route("GET", "/me/reports/reviews", (c) => {
  const user = needUser(c)
  const { period, current, compare } = periodOf(c.query)
  const id = businessOf(user)?.row?.id
  const hourly = period.granularity === "hour"
  const bucketsOf = (w: typeof current) => ({
    starts: w.starts,
    end: hourly ? (w.starts.at(-1) ?? "") : w.last,
    hourly,
  })
  return reviewsReportSchema.parse(
    buildReviewsReport({
      period,
      reviews: db.reviews
        .filter((r) => id && r.targetId === id && r.status === "visible")
        .map((r) => ({
          rating: r.rating,
          createdAt: r.createdAt,
          replyAt: r.reply?.createdAt ?? null,
        })),
      current: bucketsOf(current),
      compare: bucketsOf(compare),
    })
  )
})
