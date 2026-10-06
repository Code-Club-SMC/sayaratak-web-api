import { keepPreviousData, queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { apiFetch } from "@/lib/api/client"
import { useApiMutation } from "@/lib/api/mutation"
import { keys } from "@/lib/api/query-keys"
import { pageOf } from "@/schemas/fields"
import {
  paymentSchema,
  planSchema,
  promotionPriceSchema,
  promotionSchema,
} from "@/schemas/billing"
import type { promotionInputSchema } from "@/schemas/inputs"
import {
  checkoutSchema,
  meSubscriptionSchema,
  myPromotionsSchema,
} from "@/schemas/responses"

export const billingQueries = {
  plans: (audience?: string) =>
    queryOptions({
      queryKey: keys.billing.plans(audience),
      queryFn: ({ signal }) =>
        apiFetch("/plans", {
          query: { audience },
          schema: z.array(planSchema),
          signal,
        }),
      staleTime: 5 * 60_000,
    }),
  subscription: queryOptions({
    queryKey: keys.billing.subscription,
    queryFn: ({ signal }) =>
      apiFetch("/me/subscription", { schema: meSubscriptionSchema, signal }),
  }),
  // `item` is `plan:<planId>` or `promotion:<promotionId>`.
  checkout: (item: string) =>
    queryOptions({
      queryKey: keys.billing.checkout(item),
      queryFn: ({ signal }) =>
        apiFetch("/checkout", {
          query: { item },
          schema: checkoutSchema,
          signal,
        }),
    }),
  payments: (filters: Record<string, unknown> = {}) =>
    queryOptions({
      queryKey: keys.billing.payments(filters),
      queryFn: ({ signal }) =>
        apiFetch("/me/payments", {
          query: filters,
          schema: pageOf(paymentSchema),
          signal,
        }),
      placeholderData: keepPreviousData,
    }),
  promotionPrices: queryOptions({
    queryKey: keys.billing.promotionPrices,
    queryFn: ({ signal }) =>
      apiFetch("/promotion-prices", {
        schema: z.array(promotionPriceSchema),
        signal,
      }),
    staleTime: 5 * 60_000,
  }),
  promotions: queryOptions({
    queryKey: keys.billing.promotions,
    queryFn: ({ signal }) =>
      apiFetch("/me/promotions", {
        schema: myPromotionsSchema,
        signal,
      }).then((r) => r.items),
  }),
}

// Bankak transfer: the receipt goes up with the form, an admin approves it later.
export const useCreatePayment = () =>
  useApiMutation(
    (v: {
      itemType: "plan" | "promotion"
      itemId: string
      transactionRef: string
      payerName: string
      receipt: File
    }) => {
      const form = new FormData()
      for (const [key, value] of Object.entries(v)) form.set(key, value)
      return apiFetch("/payments", {
        method: "POST",
        form,
        schema: paymentSchema,
      })
    },
    [keys.billing.all, keys.counts]
  )
export const useCreatePromotion = () =>
  useApiMutation(
    (body: z.input<typeof promotionInputSchema>) =>
      apiFetch("/promotions", {
        method: "POST",
        body,
        schema: promotionSchema,
      }),
    [keys.billing.all]
  )
