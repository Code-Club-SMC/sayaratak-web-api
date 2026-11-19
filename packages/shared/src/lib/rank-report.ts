import type { Period } from "../schemas/period"
import { RANK_METRICS, type RankReport } from "../schemas/reports-rank"
import { within } from "./period"
import { replyRateOf, type ThreadInput } from "./replies-report"

export const RANK_MIN_PEERS = 5
export const RANK_MIN_REVIEWS = 3

// One business of the account's kind: its event counts for the period, its owner's threads and its visible reviews' star total (step 11.7-r8).
export type RankPeer = {
  id: string
  cityId: string | null
  views: number
  calls: number
  whatsapp: number
  threads: ThreadInput[]
  stars: number
  reviews: number
}

/**
 * The city rank of `selfId` among `peers` (listed businesses of its kind, the
 * account included even when not listed): in its city when 5+ are there,
 * else all Sudan. Each metric says what share of the other ranked peers the
 * account beats; ranked means a value (rating needs 3 reviews, reply rate a
 * decided inquiry) and needs 5 ranked peers.
 */
export function buildRankReport(input: {
  period: Period
  selfId: string | null
  peers: RankPeer[]
  now: number
}): RankReport {
  const { period, selfId, peers, now } = input
  const self = peers.find((p) => p.id === selfId)
  const cityId = self?.cityId ?? null
  const local = peers.filter((p) => cityId && p.cityId === cityId)
  const scope = local.length >= RANK_MIN_PEERS ? "city" : "country"
  const group = scope === "city" ? local : peers
  const metricsOf = (p: RankPeer) => ({
    views: p.views,
    contacts:
      p.calls +
      p.whatsapp +
      p.threads.reduce(
        (n, t) =>
          n +
          t.messages.filter(
            (m) => !m.mine && within(m.createdAt, period.from, period.to)
          ).length,
        0
      ),
    rating: p.reviews >= RANK_MIN_REVIEWS ? p.stars / p.reviews : null,
    replyRate: replyRateOf(p.threads, period.from, period.to, now),
  })
  const values = new Map(group.map((p) => [p.id, metricsOf(p)]))
  const mine = self ? values.get(self.id) : undefined
  return {
    period,
    scope,
    cityId,
    peers: self ? group.length : 0,
    metrics: RANK_METRICS.map((key) => {
      const all = [...values.values()].flatMap((v) =>
        v[key] === null ? [] : [v[key]]
      )
      const own = mine?.[key] ?? null
      const shown =
        own === null || key !== "rating" ? own : Math.round(own * 10) / 10
      if (own === null)
        return {
          key,
          state: "none",
          value: null,
          ranked: all.length,
          percentile: null,
        }
      if (all.length < RANK_MIN_PEERS)
        return {
          key,
          state: "few",
          value: shown,
          ranked: all.length,
          percentile: null,
        }
      const below = all.filter((v) => v < own).length
      return {
        key,
        state: "ok",
        value: shown,
        ranked: all.length,
        percentile: Math.round((below / (all.length - 1)) * 100),
      }
    }),
  }
}
