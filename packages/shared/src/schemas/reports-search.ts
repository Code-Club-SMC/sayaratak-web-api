import { z } from "zod";

import { periodSchema } from "./period";

// Admin Insights Search demand tab (step 11.7-r13, owner 2026-11-19): page-1 public searches from the daily search log (no user id, never the typed words). Searches count whole Khartoum days, so the chart is per day even when the period is per hour.

const int = z.number().int();
const countSchema = z.object({ count: int, previous: int });
// Percent with one decimal; null without searches.
const rateSchema = z.object({
  value: z.number().nullable(),
  previous: z.number().nullable(),
});

const searchPoint = z.object({ date: z.string(), searches: int, misses: int });
export type SearchPoint = z.infer<typeof searchPoint>;

// A filter value and how often it was searched; `misses` = searches that found nothing.
const topRow = z.object({ id: z.string(), searches: int, misses: int });
export type SearchTopRow = z.infer<typeof topRow>;

const makeRow = topRow.extend({
  // Vehicle listings of the make live now.
  live: int,
  // Searches per live listing, one decimal; null when none is live (owner: "No listings").
  perListing: z.number().nullable(),
});
export type SearchMakeRow = z.infer<typeof makeRow>;

// One filter set that found nothing at least once (owner: grouped by the whole set). An absent filter is "".
const missRow = z.object({
  kind: z.enum(["vehicle", "part"]),
  intent: z.string(),
  type: z.string(),
  make: z.string(),
  model: z.string(),
  city: z.string(),
  partCategory: z.string(),
  hasText: z.boolean(),
  searches: int,
  misses: int,
});
export type SearchMissRow = z.infer<typeof missRow>;

export const searchReportSchema = z.object({
  period: periodSchema,
  // Granularity of `series`: the period's, except hour becomes day.
  seriesGranularity: periodSchema.shape.granularity,
  searches: countSchema,
  misses: countSchema,
  missRate: rateSchema,
  // Share of searches with typed words.
  textRate: rateSchema,
  series: z.array(searchPoint),
  previousSeries: z.array(searchPoint),
  byKind: z.array(topRow),
  // Site average searches per live listing over the makes: make searches / live vehicle listings with a make.
  perListing: z.number().nullable(),
  makes: z.array(makeRow),
  models: z.array(topRow.extend({ makeId: z.string() })),
  cities: z.array(topRow),
  partCategories: z.array(topRow),
  missed: z.array(missRow),
});
export type SearchReport = z.infer<typeof searchReportSchema>;
