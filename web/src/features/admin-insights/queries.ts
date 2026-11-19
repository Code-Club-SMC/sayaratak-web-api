import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import type { z } from "zod"

import { apiFetch } from "@/lib/api/client"
import { keys } from "@/lib/api/query-keys"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import {
  marketplaceReportSchema,
  usersReportSchema,
} from "@sayaratak/shared/schemas/reports-insights"
import { revenueReportSchema } from "@sayaratak/shared/schemas/reports-revenue"

// One Insights tab for a period; under the admin key root, so admin changes refresh it.
const insightsQuery = <TSchema extends z.ZodType>(
  tab: string,
  schema: TSchema,
  query: PeriodQuery
) =>
  queryOptions({
    queryKey: keys.admin.list(`insights-${tab}`, query),
    queryFn: ({ signal }): Promise<z.output<TSchema>> =>
      apiFetch(`/admin/insights/${tab}`, { query, schema, signal }),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })

export const marketplaceInsightsQuery = (query: PeriodQuery) =>
  insightsQuery("marketplace", marketplaceReportSchema, query)
export const usersInsightsQuery = (query: PeriodQuery) =>
  insightsQuery("users", usersReportSchema, query)
export const revenueInsightsQuery = (query: PeriodQuery) =>
  insightsQuery("revenue", revenueReportSchema, query)
