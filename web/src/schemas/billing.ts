import { z } from "zod"

import { bilingualSchema, idSchema } from "./fields"
import { promotionTypeSchema } from "./listing"

export const planSchema = z.object({
  id: idSchema,
  audience: z.enum(["user", "dealership", "workshop", "mechanic"]),
  name: bilingualSchema,
  price: z.number().int(),
  durationDays: z.number().int(),
  listingLimit: z.number().int().optional(),
  vehicleLimit: z.number().int().optional(),
  features: z.array(bilingualSchema),
  enabled: z.boolean(),
  sortOrder: z.number().int(),
})
export type Plan = z.infer<typeof planSchema>

// `price` and `usage.limit` are copied from the plan when the subscription is created (an admin can set custom ones). `limit` is null when there is no cap.
export const subscriptionSchema = z.object({
  id: idSchema,
  userId: idSchema,
  planId: idSchema,
  status: z.enum(["active", "pending", "expired", "canceled"]),
  startsAt: z.string(),
  endsAt: z.string(),
  price: z.number().int(),
  usage: z.object({
    used: z.number().int(),
    limit: z.number().int().nullable(),
  }),
})
export type Subscription = z.infer<typeof subscriptionSchema>

export const paymentSchema = z.object({
  id: idSchema,
  userId: idSchema,
  itemType: z.enum(["plan", "promotion"]),
  itemId: idSchema,
  itemLabel: bilingualSchema,
  amount: z.number().int(),
  method: z.literal("bankak_transfer"),
  reference: z.string(),
  payerName: z.string(),
  transactionRef: z.string(),
  receiptUrl: z.string(),
  status: z.enum(["pending_review", "approved", "rejected"]),
  rejectionReason: z.string().optional(),
  createdAt: z.string(),
  reviewedAt: z.string().optional(),
})
export type Payment = z.infer<typeof paymentSchema>

// `startsAt` and `endsAt` are set when the promotion becomes active; the `promotions` array on a listing holds active ones only.
export const promotionSchema = z.object({
  id: idSchema,
  listingId: idSchema,
  type: promotionTypeSchema,
  status: z.enum(["pending_payment", "active", "ended"]),
  durationDays: z.number().int(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  source: z.enum(["paid", "admin_grant"]),
  paymentId: z.string().optional(),
})
export type Promotion = z.infer<typeof promotionSchema>

export const promotionPriceSchema = z.object({
  type: promotionTypeSchema,
  durationDays: z.number().int(),
  price: z.number().int(),
})
export type PromotionPrice = z.infer<typeof promotionPriceSchema>
