import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { z } from "zod"

import type { SearchParams } from "@/features/search/schemas"
import { apiFetch, type ApiError } from "@/lib/api/client"
import {
  patchRows,
  restore,
  snapshot,
  useApiMutation,
} from "@/lib/api/mutation"
import { keys } from "@/lib/api/query-keys"
import { analyticsSchema, okSchema, type Range } from "@/schemas/api"
import { pageOf } from "@/schemas/fields"
import type { listingCreateSchema, listingPatchSchema } from "@/schemas/inputs"
import {
  listingPageSchema,
  listingSchema,
  mediaSchema,
  type ListingStatus,
} from "@/schemas/listing"
import { taxonomySchema } from "@/schemas/taxonomy"

type Query = Record<string, unknown>

export const taxonomyQuery = queryOptions({
  queryKey: keys.taxonomy,
  queryFn: ({ signal }) =>
    apiFetch("/taxonomy", { schema: taxonomySchema, signal }),
  staleTime: Infinity,
})

export const listingQueries = {
  list: (filters: SearchParams) =>
    queryOptions({
      queryKey: keys.listings.list(filters),
      queryFn: ({ signal }) =>
        apiFetch("/listings", {
          query: filters,
          schema: listingPageSchema,
          signal,
        }),
      staleTime: 30_000,
      placeholderData: keepPreviousData, // old results stay visible while the next page loads
    }),
  detail: (slug: string) =>
    queryOptions({
      queryKey: keys.listings.detail(slug),
      queryFn: ({ signal }) =>
        apiFetch(`/listings/${slug}`, { schema: listingSchema, signal }),
      staleTime: 5 * 60_000,
    }),
  similar: (id: string) =>
    queryOptions({
      queryKey: keys.listings.similar(id),
      queryFn: ({ signal }) =>
        apiFetch(`/listings/${id}/similar`, {
          schema: z.array(listingSchema),
          signal,
        }),
      staleTime: 5 * 60_000,
    }),
  mine: (filters: Query = {}) =>
    queryOptions({
      queryKey: keys.listings.mine(filters),
      queryFn: ({ signal }) =>
        apiFetch("/me/listings", {
          query: filters,
          schema: pageOf(listingSchema),
          signal,
        }),
      staleTime: 30_000,
      placeholderData: keepPreviousData,
    }),
  analytics: (id: string, range: Range = "30d") =>
    queryOptions({
      queryKey: keys.listings.analytics(id, range),
      queryFn: ({ signal }) =>
        apiFetch(`/listings/${id}/analytics`, {
          query: { range },
          schema: analyticsSchema,
          signal,
        }),
    }),
}

const touched = [
  keys.listings.all,
  keys.counts,
  keys.billing.subscription,
] as const
export const useCreateListing = () =>
  useApiMutation(
    (body: z.input<typeof listingCreateSchema>) =>
      apiFetch("/listings", { method: "POST", body, schema: listingSchema }),
    touched
  )
export const useUpdateListing = (id: string) =>
  useApiMutation(
    (body: z.input<typeof listingPatchSchema>) =>
      apiFetch(`/listings/${id}`, {
        method: "PATCH",
        body,
        schema: listingSchema,
      }),
    touched
  )
export const useDeleteListing = () =>
  useApiMutation(
    (id: string) =>
      apiFetch(`/listings/${id}`, { method: "DELETE", schema: okSchema }),
    [...touched, keys.favorites.all]
  )
export const useRenewListing = () =>
  useApiMutation(
    (id: string) =>
      apiFetch(`/listings/${id}/renew`, {
        method: "POST",
        schema: listingSchema,
      }),
    [keys.listings.all]
  )
export const useDuplicateListing = () =>
  useApiMutation(
    (id: string) =>
      apiFetch(`/listings/${id}/duplicate`, {
        method: "POST",
        schema: listingSchema,
      }),
    touched
  )

// Optimistic: the new status shows everywhere the listing is cached, and rolls back on failure.
export function useSetListingStatus() {
  const qc = useQueryClient()
  return useMutation<
    unknown,
    ApiError,
    { id: string; status: ListingStatus },
    Awaited<ReturnType<typeof snapshot>>
  >({
    mutationFn: ({ id, status }) =>
      apiFetch(`/listings/${id}/status`, {
        method: "POST",
        body: { status },
        schema: listingSchema,
      }),
    onMutate: async ({ id, status }) => {
      const snap = await snapshot(qc, keys.listings.all)
      patchRows(qc, keys.listings.all, (rowId) => rowId === id, { status })
      return snap
    },
    onError: (_error, _vars, snap) => restore(qc, snap),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.listings.all }),
  })
}

export { useTrackEvent } from "./events"

// Images and videos, as a Media. The mock accepts uploads before sign in so the post wizard works first.
export const useUpload = () =>
  useApiMutation((file: File) => {
    const form = new FormData()
    form.set("file", file)
    return apiFetch("/uploads", { method: "POST", form, schema: mediaSchema })
  })

export const favoriteQueries = {
  ids: queryOptions({
    queryKey: keys.favorites.ids,
    queryFn: ({ signal }) =>
      apiFetch("/favorites/ids", { schema: z.array(z.string()), signal }),
    staleTime: 60_000,
  }),
  list: (filters: Query = {}) =>
    queryOptions({
      queryKey: keys.favorites.list(filters),
      queryFn: ({ signal }) =>
        apiFetch("/favorites", {
          query: filters,
          schema: pageOf(listingSchema),
          signal,
        }),
      placeholderData: keepPreviousData,
    }),
}

// Optimistic heart: the id list flips at once, then the server answers.
export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation<
    unknown,
    ApiError,
    { id: string; on: boolean },
    string[] | undefined
  >({
    mutationFn: ({ id, on }) =>
      on
        ? apiFetch("/favorites", {
            method: "POST",
            body: { listingId: id },
            schema: okSchema,
          })
        : apiFetch(`/favorites/${id}`, { method: "DELETE", schema: okSchema }),
    onMutate: async ({ id, on }) => {
      await qc.cancelQueries({ queryKey: keys.favorites.ids })
      const before = qc.getQueryData<string[]>(keys.favorites.ids)
      qc.setQueryData<string[]>(keys.favorites.ids, (ids = []) =>
        on ? [...new Set([...ids, id])] : ids.filter((x) => x !== id)
      )
      return before
    },
    onError: (_error, _vars, before) =>
      qc.setQueryData(keys.favorites.ids, before),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.favorites.all }),
  })
}
