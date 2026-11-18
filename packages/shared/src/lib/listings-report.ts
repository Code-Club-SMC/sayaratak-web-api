import type { ListingStatus } from "../schemas/listing"
import type { Period } from "../schemas/period"
import {
  type ListingFlag,
  type ListingsReport,
  type ListingsReportQuery,
  type ListingsReportRow,
  STOCK_AGE_BUCKETS,
} from "../schemas/reports"
import { instantOf } from "./period"

const DAY_MS = 86_400_000
export const LISTINGS_REPORT_PAGE_SIZE = 20

// What the API and the mock read per approved listing; the report rules below are shared so both answer alike (step 11.7-r5).
export type ListingsReportInput = {
  id: string
  slug: string
  title: string
  coverUrl: string | null
  status: ListingStatus
  photos: number
  // Approval time, or creation time when no decision was stamped.
  liveSince: string
  expiresAt: string
  soldAt: string | null
  views: number
  calls: number
  whatsapp: number
  messages: number
}

const median = (values: number[]) => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2
    ? (sorted[mid] ?? 0)
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

const daysBetween = (from: string, to: number) =>
  Math.max(0, Math.floor((to - Date.parse(from)) / DAY_MS))

const ageBucket = (days: number) =>
  days <= 15 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4

// Median whole days from approval to sold, for listings sold or rented inside [from, to).
function daysToSell(rows: ListingsReportInput[], from: string, to: string) {
  const start = instantOf(from)
  const stop = instantOf(to)
  const days = rows.flatMap((r) => {
    if (!r.soldAt) return []
    const at = Date.parse(r.soldAt)
    return at >= start && at < stop ? [daysBetween(r.liveSince, at)] : []
  })
  const m = median(days)
  return { median: m === null ? null : Math.round(m), count: days.length }
}

const SORTS: Record<string, (r: ListingsReportRow) => number> = {
  views: (r) => r.views,
  contacts: (r) => r.contacts,
  rate: (r) => r.contactRate ?? -1,
  days: (r) => r.daysLive,
  expires: (r) => Date.parse(r.expiresAt),
}

/** The Listings report of one account from its approved listings, at `now`. */
export function buildListingsReport(input: {
  rows: ListingsReportInput[]
  period: Period
  query: ListingsReportQuery
  now: number
}): ListingsReport {
  const { period, query, now } = input
  const base = input.rows.map((r) => {
    const live =
      (r.status === "available" || r.status === "reserved") &&
      Date.parse(r.expiresAt) > now
    const contacts = r.calls + r.whatsapp + r.messages
    const end = r.soldAt && !live ? Date.parse(r.soldAt) : now
    return {
      input: r,
      live,
      contacts,
      daysLive: daysBetween(r.liveSince, end),
      rate: r.views ? contacts / r.views : null,
    }
  })
  const rated = base.filter((r) => r.live && r.input.views >= 50)
  const medianRate = median(rated.map((r) => r.rate ?? 0))
  const rows: ListingsReportRow[] = base.map((r) => {
    const flags: ListingFlag[] = []
    if (r.live) {
      const none = r.daysLive >= 14 && r.input.views >= 30 && r.contacts === 0
      if (none) flags.push("no_contacts")
      if (
        !none &&
        medianRate !== null &&
        r.input.views >= 50 &&
        (r.rate ?? 0) < medianRate / 2
      )
        flags.push("low_rate")
      if (r.input.photos < 5) flags.push("few_photos")
      if (r.daysLive >= 60) flags.push("stale")
    }
    const { photos: _p, liveSince: _l, soldAt: _s, ...rest } = r.input
    return {
      ...rest,
      live: r.live,
      daysLive: r.daysLive,
      contacts: r.contacts,
      contactRate: r.rate === null ? null : Math.round(r.rate * 100),
      flags,
    }
  })
  const soon = now + 7 * DAY_MS
  const expiring = (r: ListingsReportRow) =>
    r.live && Date.parse(r.expiresAt) <= soon
  const live = rows.filter((r) => r.live)
  const stockAge = STOCK_AGE_BUCKETS.map((key) => ({ key, count: 0 }))
  for (const r of live) {
    const slot = stockAge[ageBucket(r.daysLive)]
    if (slot) slot.count += 1
  }
  const flagged = { no_contacts: 0, low_rate: 0, few_photos: 0, stale: 0 }
  for (const r of rows) for (const f of r.flags) flagged[f] += 1

  const { filter, sort, page } = query
  const kept = rows.filter((r) =>
    filter === "all"
      ? true
      : filter === "expiring"
        ? expiring(r)
        : r.flags.includes(filter)
  )
  const [key = "views", dir] = sort.split("_")
  const value = SORTS[key] ?? SORTS.views
  const sign = dir === "asc" ? 1 : -1
  // Ties keep id order, so the API and the mock page alike.
  kept.sort(
    (a, b) =>
      sign * ((value?.(a) ?? 0) - (value?.(b) ?? 0)) || (a.id < b.id ? -1 : 1)
  )
  const size = LISTINGS_REPORT_PAGE_SIZE
  return {
    period,
    summary: {
      live: live.length,
      expiringSoon: rows.filter(expiring).length,
      stockAge,
      medianRate: medianRate === null ? null : Math.round(medianRate * 100),
      flagged,
      daysToSell: daysToSell(input.rows, period.from, period.to),
      previousDaysToSell: daysToSell(
        input.rows,
        period.compareFrom,
        period.compareTo
      ),
    },
    rows: {
      items: kept.slice((page - 1) * size, page * size),
      total: kept.length,
      page,
      pageSize: size,
    },
  }
}
