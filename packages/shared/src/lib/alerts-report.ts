import type { Period } from "../schemas/period"
import type { AlertsReport } from "../schemas/reports-alerts"
import type { SavedSearch } from "../schemas/saved-search"
import { alignStarts, alignTo, type Buckets, sumTimed, within } from "./period"

// One saved search with the instants its matching listings went public (step 11.7-r9); the caller already left out the account's own listings.
export type AlertsInput = SavedSearch & { matchedAt: string[] }

/** The saved-search Alerts report: matches per search in the period and the compare window, and per bucket for all searches. */
export function buildAlertsReport(input: {
  period: Period
  searches: AlertsInput[]
  current: Buckets
  compare: Buckets
}): AlertsReport {
  const { period, searches, current, compare } = input
  const length = current.starts.length
  const inNow = (iso: string) => within(iso, period.from, period.to)
  const inBefore = (iso: string) =>
    within(iso, period.compareFrom, period.compareTo)
  const rows = [...searches]
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
    )
    .map(({ matchedAt, createdAt: _, ...s }) => ({
      ...s,
      matches: matchedAt.filter(inNow).length,
      previous: matchedAt.filter(inBefore).length,
    }))
  const seriesOf = (b: Buckets, keep: (iso: string) => boolean) => {
    const sums = alignTo(
      sumTimed(
        b,
        searches.flatMap((s) =>
          s.matchedAt.filter(keep).map((iso): [string, number] => [iso, 1])
        )
      ),
      length
    )
    return alignStarts(b.starts, length).map((date, i) => ({
      date,
      matches: sums[i] ?? 0,
    }))
  }
  return {
    period,
    searches: rows.length,
    alertsOn: rows.filter((r) => r.alerts).length,
    matches: rows.reduce((n, r) => n + r.matches, 0),
    previous: rows.reduce((n, r) => n + r.previous, 0),
    series: seriesOf(current, inNow),
    previousSeries: seriesOf(compare, inBefore),
    rows,
  }
}
