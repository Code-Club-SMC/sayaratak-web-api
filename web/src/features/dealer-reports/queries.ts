import { keepPreviousData, queryOptions } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api/client"
import { keys } from "@/lib/api/query-keys"
import {
  listingsReportSchema,
  type ListingsReportQuery,
} from "@sayaratak/shared/schemas/reports"

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
