import type { PromotionType } from "../schemas/listing"
import type { Period } from "../schemas/period"
import type {
  CampaignReportRow,
  PromotionReportRow,
  PromotionsReport,
} from "../schemas/reports-promotions"
import {
  addMinutesDays,
  daysBetweenMinutes,
  instantOf,
  minuteOf,
} from "./period"

// Owner, step 11.7-r6: a bump has no length, so it is measured over the 3 days after it.
export const BUMP_DAYS = 3

// A started promotion of one of the account's listings.
export type PromotionInput = {
  id: string
  listingId: string
  type: PromotionType
  source: PromotionReportRow["source"]
  startsAt: string
  endsAt: string
  amount: number | null
}

// The Khartoum minutes the caller counts views and contacts over: [before, start) and [start, end).
export type Stretch = {
  promotion: PromotionInput
  before: string
  start: string
  end: string
}

const earliest = (...minutes: string[]) => minutes.sort()[0] ?? ""
const latest = (...minutes: string[]) => minutes.sort().at(-1) ?? ""

/**
 * The promotions that ran inside the period, newest start first, with the
 * stretches to count: while it ran (a bump: 3 days; cut at now and at the
 * listing's next promotion) and the same length just before, not before
 * the listing went live.
 */
export function promotionStretches(input: {
  promotions: PromotionInput[]
  period: Period
  now: number
  liveSince: Map<string, string>
}): Stretch[] {
  const { period } = input
  const now = minuteOf(new Date(input.now).toISOString())
  const starts = input.promotions.map((p) => ({
    p,
    start: minuteOf(p.startsAt),
  }))
  return starts
    .flatMap(({ p, start }) => {
      const full =
        p.type === "bump"
          ? addMinutesDays(start, BUMP_DAYS)
          : minuteOf(p.endsAt)
      if (start >= period.to || full <= period.from) return []
      const next = starts
        .filter((o) => o.p.listingId === p.listingId && o.start > start)
        .map((o) => o.start)
      const end = latest(start, earliest(full, now, ...next))
      const live = minuteOf(input.liveSince.get(p.listingId) ?? p.startsAt)
      const before = earliest(
        start,
        latest(addMinutesDays(start, -daysBetweenMinutes(start, end)), live)
      )
      return [{ promotion: p, before, start, end }]
    })
    .sort(
      (a, b) =>
        (a.start < b.start ? 1 : a.start > b.start ? -1 : 0) ||
        (a.promotion.id < b.promotion.id ? -1 : 1)
    )
}

const iso = (minute: string) => new Date(instantOf(minute)).toISOString()
const days = (from: string, to: string) =>
  Math.round(daysBetweenMinutes(from, to) * 100) / 100

export type CountedStretch = Stretch & {
  card: { slug: string; title: string; coverUrl: string | null }
  beforeCounts: { views: number; contacts: number }
  duringCounts: { views: number; contacts: number }
}

export type CampaignInput = Omit<
  CampaignReportRow,
  "ctr" | "costPerClick" | "impressions" | "clicks"
> & { totalClicks: number }

/** The Promotions report from the counted stretches and the campaigns that ran inside the period. */
export function buildPromotionsReport(input: {
  period: Period
  stretches: CountedStretch[]
  campaigns: CampaignInput[]
}): PromotionsReport {
  const promotions: PromotionReportRow[] = input.stretches.map((s) => {
    const p = s.promotion
    const beforeDays = daysBetweenMinutes(s.before, s.start)
    const duringDays = daysBetweenMinutes(s.start, s.end)
    // Under an hour before the promotion is too little to read a rate from.
    const extra =
      beforeDays >= 1 / 24
        ? Math.round(
            s.duringCounts.contacts -
              (s.beforeCounts.contacts / beforeDays) * duringDays
          )
        : null
    return {
      id: p.id,
      listingId: p.listingId,
      ...s.card,
      type: p.type,
      source: p.source,
      startsAt: iso(s.start),
      endsAt: iso(s.end),
      amount: p.amount,
      before: { days: days(s.before, s.start), ...s.beforeCounts },
      during: { days: days(s.start, s.end), ...s.duringCounts },
      extraContacts: extra,
      costPerExtraContact:
        p.amount !== null && extra !== null && extra > 0
          ? Math.round(p.amount / extra)
          : null,
    }
  })
  const paid = promotions.filter(
    (p) => p.amount !== null && p.extraContacts !== null
  )
  const spent = promotions.reduce((a, p) => a + (p.amount ?? 0), 0)
  const paidSpent = paid.reduce((a, p) => a + (p.amount ?? 0), 0)
  const paidExtra = paid.reduce((a, p) => a + (p.extraContacts ?? 0), 0)
  return {
    period: input.period,
    summary: {
      spent,
      extraContacts: promotions.reduce((a, p) => a + (p.extraContacts ?? 0), 0),
      costPerExtraContact:
        paidExtra > 0 ? Math.round(paidSpent / paidExtra) : null,
    },
    promotions,
    // Newest start first, ties by id, so the API and the mock list alike.
    campaigns: [...input.campaigns]
      .sort(
        (a, b) =>
          Date.parse(b.startsAt) - Date.parse(a.startsAt) ||
          (a.id < b.id ? -1 : 1)
      )
      .map(({ totalClicks, ...c }) => {
        const impressions = c.daily.reduce((a, d) => a + d.impressions, 0)
        const clicks = c.daily.reduce((a, d) => a + d.clicks, 0)
        return {
          ...c,
          impressions,
          clicks,
          ctr: impressions
            ? Math.round((clicks / impressions) * 1000) / 10
            : null,
          costPerClick: totalClicks ? Math.round(c.amount / totalClicks) : null,
        }
      }),
  }
}
