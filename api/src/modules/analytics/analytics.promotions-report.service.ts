import {
  buildPromotionsReport,
  type CampaignInput,
  type PromotionInput,
  promotionStretches,
} from "@sayaratak/shared/lib/promotions-report"
import { instantOf } from "@sayaratak/shared/lib/period"
import type { Period, PeriodQuery } from "@sayaratak/shared/schemas/period"
import type { PromotionsReport } from "@sayaratak/shared/schemas/reports-promotions"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import { listMyCampaigns } from "~/modules/ads/ads.campaigns.service"
import type { SessionUser } from "~/modules/auth/auth.types"
import * as listings from "~/modules/listings/listings.stats.service"
import * as messaging from "~/modules/messaging/messaging.service"
import * as payments from "~/modules/payments/payments.service"
import * as promotions from "~/modules/promotions/promotions.service"

import { NO_COUNTS } from "./analytics.mapper"
import {
  bannerSeries,
  countsPerTarget,
  type Window,
  windowAt,
  windowsOf,
} from "./analytics.period"

/**
 * The Promotions report (step 11.7-r6): each promotion that ran inside the
 * period against the same length before it, and the paid banner campaigns
 * with their counts per bucket. The rules are the shared builder's.
 */
export async function getPromotionsReport(
  user: SessionUser,
  query: PeriodQuery
): Promise<PromotionsReport> {
  const { period, current } = windowsOf(query)
  const [stretches, campaigns] = await Promise.all([
    countedStretches(user, period, current.today),
    campaignsOf(user, current, period),
  ])
  return buildPromotionsReport({ period, stretches, campaigns })
}

type Started = Awaited<ReturnType<typeof promotions.listStartedOf>>[number]

// A started promotion as the shared builder reads it. A paid one costs its approved payment, else its price (old rows have no payment).
function toInput(
  { promotion: p, price }: Started,
  amounts: Map<string, number>
): PromotionInput[] {
  if (!p.startsAt || !p.endsAt) return []
  const paid = p.paymentId ? amounts.get(p.paymentId) : undefined
  return [
    {
      id: p.id,
      listingId: p.listingId,
      type: p.type,
      source: p.source,
      startsAt: p.startsAt.toISOString(),
      endsAt: p.endsAt.toISOString(),
      amount: p.source === "paid" ? (paid ?? price ?? null) : null,
    },
  ]
}

async function countedStretches(
  user: SessionUser,
  period: Period,
  today: string
) {
  const mine = await listings.listReportListings(db, user.id)
  const cards = new Map(mine.map((l) => [l.id, l]))
  const started = await promotions.listStartedOf(db, [...cards.keys()])
  const amounts = await payments.getApprovedAmounts(
    db,
    started.flatMap((r) =>
      r.promotion.paymentId ? [r.promotion.paymentId] : []
    )
  )
  const stretches = promotionStretches({
    period,
    now: clock.now().getTime(),
    liveSince: new Map(mine.map((l) => [l.id, l.liveSince])),
    promotions: started.flatMap((row) => toInput(row, amounts)),
  })
  const count = (listingId: string, from: string, to: string) =>
    countStretch({ user, listingId, from, to, today })
  return Promise.all(
    stretches.map(async (s) => {
      const card = cards.get(s.promotion.listingId)
      const [beforeCounts, duringCounts] = await Promise.all([
        count(s.promotion.listingId, s.before, s.start),
        count(s.promotion.listingId, s.start, s.end),
      ])
      return {
        ...s,
        card: {
          slug: card?.slug ?? "",
          title: card?.title ?? "",
          coverUrl: card?.coverUrl ?? null,
        },
        beforeCounts,
        duringCounts,
      }
    })
  )
}

// Views and contacts (calls, WhatsApp, messages received) of one listing inside Khartoum minutes [from, to).
async function countStretch(input: {
  user: SessionUser
  listingId: string
  from: string
  to: string
  today: string
}) {
  const { listingId, from, to } = input
  if (from >= to) return { views: 0, contacts: 0 }
  const { w, rolledUp } = windowAt(from, to, input.today)
  const [counts, received] = await Promise.all([
    countsPerTarget([listingId], w, { rolledUp }),
    messaging.countReceivedPerListing(db, input.user.id, w),
  ])
  const c = counts.get(listingId) ?? NO_COUNTS
  return {
    views: c.views,
    contacts: c.phoneClicks + c.whatsappClicks + (received.get(listingId) ?? 0),
  }
}

// The account's approved campaigns that ran inside the period, with banner views and clicks per bucket.
async function campaignsOf(
  user: SessionUser,
  current: Window,
  period: Period
): Promise<CampaignInput[]> {
  const from = instantOf(period.from)
  const to = instantOf(period.to)
  const ran = (await listMyCampaigns(user)).filter(
    (c) =>
      c.status === "approved" &&
      Date.parse(c.startsAt) < to &&
      Date.parse(c.endsAt) > from
  )
  return Promise.all(
    ran.map(async (c) => {
      const s = await bannerSeries(c.id, current, period)
      return {
        id: c.id,
        imageUrl: c.creative.imageUrl,
        pages: c.pages,
        startsAt: c.startsAt,
        endsAt: c.endsAt,
        amount: c.amount,
        totalClicks: c.clicks,
        daily: current.starts.map((date, i) => ({
          date,
          impressions: s.impressions[i] ?? 0,
          clicks: s.clicks[i] ?? 0,
        })),
      }
    })
  )
}
