import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"
import { z } from "zod"

import { apiFetch, type ApiError } from "@/lib/api/client"
import { useApiMutation } from "@/lib/api/mutation"
import { keys } from "@/lib/api/query-keys"
import { okSchema } from "@/schemas/api"
import { pageOf } from "@/schemas/fields"
import type { portfolioInputSchema, serviceInputSchema } from "@/schemas/inputs"
import {
  dealershipSchema,
  mechanicSchema,
  workshopSchema,
} from "@/schemas/profile"

type Query = Record<string, unknown>
export type DirectoryType = "dealerships" | "workshops" | "mechanics"

// One typed pair per directory: a generic `type` argument loses the row type at the call site.
// Filters: dealerships q, city, verified, sort; workshops add service, openNow, lat and lng; mechanics add specialization, minYears, available.
const directory = <TSchema extends z.ZodType>(
  type: DirectoryType,
  schema: TSchema
) => ({
  list: (filters: Query = {}) =>
    queryOptions({
      queryKey: keys.directory.list(type, filters),
      queryFn: ({ signal }) =>
        apiFetch(`/${type}`, {
          query: filters,
          schema: pageOf(schema),
          signal,
        }),
      staleTime: 30_000,
      placeholderData: keepPreviousData,
    }),
  detail: (slug: string) =>
    queryOptions({
      queryKey: keys.directory.detail(type, slug),
      queryFn: ({ signal }) => apiFetch(`/${type}/${slug}`, { schema, signal }),
      staleTime: 5 * 60_000,
    }),
})
export const directoryQueries = {
  dealerships: directory("dealerships", dealershipSchema),
  workshops: directory("workshops", workshopSchema),
  mechanics: directory("mechanics", mechanicSchema),
}

const mineSchema = z.union([dealershipSchema, workshopSchema, mechanicSchema])
export const businessQueries = {
  mine: queryOptions({
    queryKey: keys.business.mine,
    queryFn: ({ signal }) =>
      apiFetch("/me/business", { schema: mineSchema, signal }),
  }),
  services: queryOptions({
    queryKey: keys.business.services,
    queryFn: ({ signal }) =>
      apiFetch("/me/services", {
        schema: workshopSchema.shape.services,
        signal,
      }),
  }),
  portfolio: queryOptions({
    queryKey: keys.business.portfolio,
    queryFn: ({ signal }) =>
      apiFetch("/me/portfolio", {
        schema: mechanicSchema.shape.portfolio,
        signal,
      }),
  }),
}

const touched = [
  keys.business.all,
  keys.directory.all("dealerships"),
  keys.directory.all("workshops"),
  keys.directory.all("mechanics"),
] as const
const serviceRow = workshopSchema.shape.services.element
const portfolioRow = mechanicSchema.shape.portfolio.element
type Input<T extends z.ZodType> = z.input<T>
type Services = z.infer<typeof workshopSchema.shape.services>

export const useUpdateBusiness = () =>
  useApiMutation(
    (body: Record<string, unknown>) =>
      apiFetch("/me/business", { method: "PATCH", body, schema: mineSchema }),
    touched
  )
export const useAddBusinessImage = () =>
  useApiMutation(
    (url: string) =>
      apiFetch("/me/business/images", {
        method: "POST",
        body: { url },
        schema: workshopSchema,
      }),
    touched
  )
export const useReorderBusinessImages = () =>
  useApiMutation(
    (ids: string[]) =>
      apiFetch("/me/business/images", {
        method: "PUT",
        body: { ids },
        schema: workshopSchema,
      }),
    touched
  )

export const useAddService = () =>
  useApiMutation(
    (body: Input<typeof serviceInputSchema>) =>
      apiFetch("/me/services", { method: "POST", body, schema: serviceRow }),
    touched
  )
export const useUpdateService = () =>
  useApiMutation(
    ({
      id,
      ...body
    }: { id: string } & Partial<Input<typeof serviceInputSchema>>) =>
      apiFetch(`/me/services/${id}`, {
        method: "PATCH",
        body,
        schema: serviceRow,
      }),
    touched
  )
export const useDeleteService = () =>
  useApiMutation(
    (id: string) =>
      apiFetch(`/me/services/${id}`, { method: "DELETE", schema: okSchema }),
    touched
  )
// Optimistic: the list takes the new order at once and goes back if the save fails.
export function useReorderServices() {
  const qc = useQueryClient()
  const key = businessQueries.services.queryKey
  return useMutation<Services, ApiError, string[], Services | undefined>({
    mutationFn: (ids) =>
      apiFetch("/me/services/reorder", {
        method: "POST",
        body: { ids },
        schema: workshopSchema.shape.services,
      }),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData(key)
      if (prev)
        qc.setQueryData(
          key,
          ids.flatMap((id) => prev.filter((s) => s.id === id))
        )
      return prev
    },
    onError: (_error, _ids, prev) => qc.setQueryData(key, prev),
    onSettled: () =>
      Promise.all(
        touched.map((queryKey) => qc.invalidateQueries({ queryKey }))
      ),
  })
}

export const useAddPortfolioItem = () =>
  useApiMutation(
    (body: Input<typeof portfolioInputSchema>) =>
      apiFetch("/me/portfolio", { method: "POST", body, schema: portfolioRow }),
    touched
  )
export const useUpdatePortfolioItem = () =>
  useApiMutation(
    ({
      id,
      ...body
    }: { id: string } & Partial<Input<typeof portfolioInputSchema>>) =>
      apiFetch(`/me/portfolio/${id}`, {
        method: "PATCH",
        body,
        schema: portfolioRow,
      }),
    touched
  )
export const useDeletePortfolioItem = () =>
  useApiMutation(
    (id: string) =>
      apiFetch(`/me/portfolio/${id}`, { method: "DELETE", schema: okSchema }),
    touched
  )
export const useReorderPortfolio = () =>
  useApiMutation(
    (ids: string[]) =>
      apiFetch("/me/portfolio/reorder", {
        method: "POST",
        body: { ids },
        schema: mechanicSchema.shape.portfolio,
      }),
    touched
  )
