import { queryOptions } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api/client"
import { keys } from "@/lib/api/query-keys"
import { type Range } from "@sayaratak/shared/schemas/api"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import { analyticsSchema } from "@sayaratak/shared/schemas/responses"
import { presetQuery } from "./schemas"

// Role scoped by the server: seller, dealership, workshop, mechanic or admin totals and series, with the compare window.
export const analyticsQuery = (period: Range | PeriodQuery = "30d") => {
  const query = typeof period === "string" ? presetQuery(period) : period
  return queryOptions({
    queryKey: keys.analytics(query),
    queryFn: ({ signal }) =>
      apiFetch("/me/analytics", { query, schema: analyticsSchema, signal }),
    staleTime: 60_000,
  })
}
