import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import type { z } from "zod"

import { apiFetch } from "@/lib/api/client"
import { keys } from "@/lib/api/query-keys"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import {
  listingsReportSchema,
  type ListingsReportQuery,
} from "@sayaratak/shared/schemas/reports"
import { demandReportSchema } from "@sayaratak/shared/schemas/reports-demand"
import {
  priceReportSchema,
  type PriceReportQuery,
} from "@sayaratak/shared/schemas/reports-price"
import { rankReportSchema } from "@sayaratak/shared/schemas/reports-rank"
import { promotionsReportSchema } from "@sayaratak/shared/schemas/reports-promotions"
import { repliesReportSchema } from "@sayaratak/shared/schemas/reports-replies"
import { reviewsReportSchema } from "@sayaratak/shared/schemas/reports-reviews"

// The account's approved listings with the period's counts, flags and stock summary; one page of 20.
export const listingsReportQuery = (query: ListingsReportQuery) =>
  queryOptions({
    queryKey: keys.reports.listings(query),
    queryFn: ({ signal }) =>
      apiFetch("/me/reports/listings", {
        query,
        schema: listingsReportSchema,
        signal,
      }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

// One of the step 11.7-r6 tabs for a period, or the r7 Price tab for its band and page.
const tabQuery = <TSchema extends z.ZodType>(
  name: string,
  schema: TSchema,
  query: PeriodQuery | PriceReportQuery
) =>
  queryOptions({
    queryKey: keys.reports.tab(name, query),
    queryFn: ({ signal }): Promise<z.output<TSchema>> =>
      apiFetch(`/me/reports/${name}`, { query, schema, signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

export const promotionsReportQuery = (query: PeriodQuery) =>
  tabQuery("promotions", promotionsReportSchema, query)
export const demandReportQuery = (query: PeriodQuery) =>
  tabQuery("demand", demandReportSchema, query)
export const repliesReportQuery = (query: PeriodQuery) =>
  tabQuery("replies", repliesReportSchema, query)
export const reviewsReportQuery = (query: PeriodQuery) =>
  tabQuery("reviews", reviewsReportSchema, query)
export const priceReportQuery = (query: PriceReportQuery) =>
  tabQuery("price", priceReportSchema, query)
export const rankReportQuery = (query: PeriodQuery) =>
  tabQuery("rank", rankReportSchema, query)
