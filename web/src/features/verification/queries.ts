import { queryOptions } from "@tanstack/react-query"
import type { z } from "zod"

import { apiFetch } from "@/lib/api/client"
import { useApiMutation } from "@/lib/api/mutation"
import { keys } from "@/lib/api/query-keys"
import { reportSchema, verificationRequestSchema } from "@/schemas/admin"
import type {
  reportInputSchema,
  verificationInputSchema,
} from "@/schemas/inputs"

export const verificationQuery = queryOptions({
  queryKey: keys.verification,
  queryFn: ({ signal }) =>
    apiFetch("/me/verification", {
      schema: verificationRequestSchema.nullable(),
      signal,
    }),
})

export const useReportListing = () =>
  useApiMutation((body: z.input<typeof reportInputSchema>) =>
    apiFetch("/reports", { method: "POST", body, schema: reportSchema })
  )
export const useRequestVerification = () =>
  useApiMutation(
    (body: z.input<typeof verificationInputSchema>) =>
      apiFetch("/me/verification", {
        method: "POST",
        body,
        schema: verificationRequestSchema,
      }),
    [keys.verification]
  )
