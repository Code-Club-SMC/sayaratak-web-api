import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { apiFetch } from "@/lib/api/client"
import { useApiMutation } from "@/lib/api/mutation"
import { keys } from "@/lib/api/query-keys"
import { bannerSchema, sitePageSchema } from "@/schemas/admin"
import { okSchema } from "@/schemas/api"
import type { contactInputSchema } from "@/schemas/inputs"

export const pageQuery = (slug: string) =>
  queryOptions({
    queryKey: keys.content.page(slug),
    queryFn: ({ signal }) =>
      apiFetch(`/pages/${slug}`, { schema: sitePageSchema, signal }),
    staleTime: 5 * 60_000,
  })
export const bannersQuery = (placement?: string) =>
  queryOptions({
    queryKey: keys.content.banners(placement),
    queryFn: ({ signal }) =>
      apiFetch("/banners", {
        query: { placement },
        schema: z.array(bannerSchema),
        signal,
      }),
    staleTime: 5 * 60_000,
  })

export const useSendContact = () =>
  useApiMutation((body: z.input<typeof contactInputSchema>) =>
    apiFetch("/contact", { method: "POST", body, schema: okSchema })
  )
