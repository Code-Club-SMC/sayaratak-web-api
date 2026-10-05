import { z } from "zod"

export const reviewSchema = z
  .object({
    rating: z
      .number({ error: "validation.rating_required" })
      .int()
      .min(1, "validation.rating_required")
      .max(5),
    body: z.string().trim().max(1000, "validation.too_long").optional(),
  })
  .refine((v) => !v.body || v.body.length >= 10, {
    path: ["body"],
    message: "validation.review_min",
  })
export type ReviewForm = z.infer<typeof reviewSchema>
