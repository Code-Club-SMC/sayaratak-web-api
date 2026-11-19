import type { Period } from "../schemas/period";
import type {
  SearchMissRow,
  SearchPoint,
  SearchReport,
  SearchTopRow,
} from "../schemas/reports-search";
import { alignStarts, alignTo, bucketsOf, daysOf, sumInto } from "./period";
import type { PriceListing } from "./price-position";

// Live = approved, available or reserved, not expired (as `isLiveAt`).
// What the API and the mock read for the admin Search demand tab (step 11.7-r13): rows of the daily search log and the listings that left draft.
export type SearchDayInput = {
  day: string;
  kind: string;
  intent: string;
  type: string;
  make: string;
  model: string;
  city: string;
  partCategory: string;
  hasText: boolean;
  searches: number;
  zeroResults: number;
};
export type SearchListingInput = Pick<
  PriceListing,
  "kind" | "makeId" | "status" | "expiresAt"
> & { moderation: string };

export const SEARCH_TOP_ROWS = 15;
export const SEARCH_MISSED_ROWS = 20;

const pct = (part: number, whole: number) =>
  whole ? Math.round((part / whole) * 1000) / 10 : null;
const round1 = (n: number) => Math.round(n * 10) / 10;
const sum = (rows: SearchDayInput[], pick: (r: SearchDayInput) => number) =>
  rows.reduce((a, r) => a + pick(r), 0);

// Searches and misses per filter value ("" left out), most searched first.
function topOf(
  rows: SearchDayInput[],
  keyOf: (r: SearchDayInput) => string,
  limit = SEARCH_TOP_ROWS,
): SearchTopRow[] {
  const groups = new Map<string, SearchTopRow>();
  for (const r of rows) {
    const id = keyOf(r);
    if (!id) continue;
    const g = groups.get(id) ?? { id, searches: 0, misses: 0 };
    g.searches += r.searches;
    g.misses += r.zeroResults;
    groups.set(id, g);
  }
  return [...groups.values()]
    .sort((a, b) => b.searches - a.searches || a.id.localeCompare(b.id))
    .slice(0, limit);
}

const missKeys = [
  "kind",
  "intent",
  "type",
  "make",
  "model",
  "city",
  "partCategory",
] as const;

// Filter sets that found nothing at least once, most misses first.
function missedOf(rows: SearchDayInput[]): SearchMissRow[] {
  const groups = new Map<string, SearchMissRow>();
  for (const r of rows) {
    if (!r.zeroResults) continue;
    const key = [...missKeys.map((k) => r[k]), r.hasText].join("|");
    const g = groups.get(key) ?? {
      kind: r.kind === "part" ? ("part" as const) : ("vehicle" as const),
      intent: r.intent,
      type: r.type,
      make: r.make,
      model: r.model,
      city: r.city,
      partCategory: r.partCategory,
      hasText: r.hasText,
      searches: 0,
      misses: 0,
    };
    g.misses += r.zeroResults;
    groups.set(key, g);
  }
  // Every search of the set, including the ones that found something.
  for (const r of rows) {
    const g = groups.get([...missKeys.map((k) => r[k]), r.hasText].join("|"));
    if (g) g.searches += r.searches;
  }
  return [...groups.values()]
    .sort((a, b) => b.misses - a.misses || b.searches - a.searches)
    .slice(0, SEARCH_MISSED_ROWS);
}

/** The admin Search demand tab: searches and misses per bucket, top makes, models, cities and part categories, searches per live listing per make, and the filter sets that found nothing. Search rows count whole days, so a window takes every day it touches. */
export function buildSearchReport(input: {
  period: Period;
  rows: SearchDayInput[];
  listings: SearchListingInput[];
  now: number;
}): SearchReport {
  const { period, listings, now } = input;
  const granularity =
    period.granularity === "hour" ? "day" : period.granularity;
  const window = (from: string, to: string) => {
    const { first, last } = daysOf(from, to);
    return {
      last,
      starts: bucketsOf(first, last, granularity),
      rows: input.rows.filter((r) => r.day >= first && r.day <= last),
    };
  };
  const cur = window(period.from, period.to);
  const prev = window(period.compareFrom, period.compareTo);
  const length = cur.starts.length;
  const seriesOf = (w: typeof cur): SearchPoint[] => {
    const of = (pick: (r: SearchDayInput) => number) =>
      alignTo(
        sumInto(
          w.starts,
          w.last,
          w.rows.map((r): [string, number] => [r.day, pick(r)]),
        ),
        length,
      );
    const searches = of((r) => r.searches);
    const misses = of((r) => r.zeroResults);
    return alignStarts(w.starts, length).map((date, i) => ({
      date,
      searches: searches[i] ?? 0,
      misses: misses[i] ?? 0,
    }));
  };
  const totals = (rows: SearchDayInput[]) => ({
    searches: sum(rows, (r) => r.searches),
    misses: sum(rows, (r) => r.zeroResults),
    text: sum(rows, (r) => (r.hasText ? r.searches : 0)),
  });
  const a = totals(cur.rows);
  const b = totals(prev.rows);

  const live = new Map<string, number>();
  for (const l of listings)
    if (
      l.moderation === "approved" &&
      l.kind === "vehicle" &&
      l.makeId &&
      (l.status === "available" || l.status === "reserved") &&
      Date.parse(l.expiresAt) > now
    )
      live.set(l.makeId, (live.get(l.makeId) ?? 0) + 1);
  const vehicles = cur.rows.filter((r) => r.kind === "vehicle");
  const makeSearches = sum(
    vehicles.filter((r) => r.make),
    (r) => r.searches,
  );
  const liveTotal = [...live.values()].reduce((x, y) => x + y, 0);

  return {
    period,
    seriesGranularity: granularity,
    searches: { count: a.searches, previous: b.searches },
    misses: { count: a.misses, previous: b.misses },
    missRate: {
      value: pct(a.misses, a.searches),
      previous: pct(b.misses, b.searches),
    },
    textRate: {
      value: pct(a.text, a.searches),
      previous: pct(b.text, b.searches),
    },
    series: seriesOf(cur),
    previousSeries: seriesOf(prev),
    byKind: topOf(cur.rows, (r) => r.kind),
    perListing: liveTotal ? round1(makeSearches / liveTotal) : null,
    makes: topOf(vehicles, (r) => r.make).map((r) => {
      const count = live.get(r.id) ?? 0;
      return {
        ...r,
        live: count,
        perListing: count ? round1(r.searches / count) : null,
      };
    }),
    models: topOf(vehicles, (r) => (r.model ? `${r.make}|${r.model}` : "")).map(
      (r) => {
        const [makeId = "", modelId = ""] = r.id.split("|");
        return { ...r, id: modelId, makeId };
      },
    ),
    cities: topOf(cur.rows, (r) => r.city),
    partCategories: topOf(
      cur.rows.filter((r) => r.kind === "part"),
      (r) => r.partCategory,
    ),
    missed: missedOf(cur.rows),
  };
}
