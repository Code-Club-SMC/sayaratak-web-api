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

// `limit` is null when the plan has no cap.
export const subscriptionSchema = z.object({
  id: idSchema,
  userId: idSchema,
  planId: idSchema,
  status: z.enum(["active", "pending", "expired", "canceled"]),
  startsAt: z.string(),
  endsAt: z.string(),
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
  itemLabel: z.string(),
  amount: z.number().int(),
  method: z.literal("bankak_transfer"),
  reference: z.string(),
  transactionRef: z.string(),
  receiptUrl: z.string(),
  status: z.enum(["pending_review", "approved", "rejected"]),
  rejectionReason: z.string().optional(),
  createdAt: z.string(),
  reviewedAt: z.string().optional(),
})
export type Payment = z.infer<typeof paymentSchema>

export const promotionSchema = z.object({
  id: idSchema,
  listingId: idSchema,
  type: promotionTypeSchema,
  startsAt: z.string(),
  endsAt: z.string(),
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
