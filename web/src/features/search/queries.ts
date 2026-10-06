import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { apiFetch } from "@/lib/api/client"
import { useApiMutation } from "@/lib/api/mutation"
import { keys } from "@/lib/api/query-keys"
import { okSchema } from "@/schemas/api"
import { mapResponseSchema } from "@/schemas/responses"
import type {
  savedSearchInputSchema,
  savedSearchPatchSchema,
} from "@/schemas/inputs"
import { savedSearchSchema } from "@/schemas/saved-search"

// `layers` repeats in the query string like every array param.
type MapFilters = { layers?: string[]; bbox?: string }

export const savedSearchQueries = {
  list: queryOptions({
    queryKey: keys.savedSearches,
    queryFn: ({ signal }) =>
      apiFetch("/saved-searches", {
        schema: z.array(savedSearchSchema),
        signal,
      }),
    staleTime: 30_000,
  }),
}
export const mapQuery = (filters: MapFilters) =>
  queryOptions({
    queryKey: keys.map(filters),
    queryFn: ({ signal }) =>
      apiFetch("/map", {
        query: filters,
        schema: mapResponseSchema,
        signal,
      }),
    staleTime: 60_000,
  })

export const useCreateSavedSearch = () =>
  useApiMutation(
    (body: z.input<typeof savedSearchInputSchema>) =>
      apiFetch("/saved-searches", {
        method: "POST",
        body,
        schema: savedSearchSchema,
      }),
    [keys.savedSearches]
  )
export const useUpdateSavedSearch = () =>
  useApiMutation(
    ({
      id,
      ...body
    }: { id: string } & z.input<typeof savedSearchPatchSchema>) =>
      apiFetch(`/saved-searches/${id}`, {
        method: "PATCH",
        body,
        schema: savedSearchSchema,
      }),
    [keys.savedSearches]
  )
export const useDeleteSavedSearch = () =>
  useApiMutation(
    (id: string) =>
      apiFetch(`/saved-searches/${id}`, { method: "DELETE", schema: okSchema }),
    [keys.savedSearches]
  )
