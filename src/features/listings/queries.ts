import { queryOptions } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api/client"
import { keys } from "@/lib/api/query-keys"
import { taxonomySchema } from "@/schemas/taxonomy"

export const taxonomyQuery = queryOptions({
  queryKey: keys.taxonomy,
  queryFn: ({ signal }) =>
    apiFetch("/taxonomy", { schema: taxonomySchema, signal }),
  staleTime: Infinity,
})
