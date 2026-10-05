import { z } from "zod"

import { idSchema } from "./fields"

export const ratingSchema = z.object({
  avg: z.number(),
  count: z.number().int(),
})
export type Rating = z.infer<typeof ratingSchema>

// The three kinds of business profile that can be reviewed (and verified).
export const targetTypeSchema = z.enum(["dealership", "workshop", "mechanic"])
export type TargetType = z.infer<typeof targetTypeSchema>

export const reviewSchema = z.object({
  id: idSchema,
  targetType: targetTypeSchema,
  targetId: idSchema,
  authorId: idSchema,
  authorName: z.string(),
  rating: z.number().int().min(1).max(5),
  body: z.string().optional(),
  createdAt: z.string(),
  reply: z.object({ body: z.string(), createdAt: z.string() }).optional(),
  status: z.enum(["visible", "hidden", "flagged"]),
})
export type Review = z.infer<typeof reviewSchema>
