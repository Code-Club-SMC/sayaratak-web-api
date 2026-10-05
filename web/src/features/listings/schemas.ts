import { z } from "zod"

export const reportReasons = [
  "scam",
  "wrong_category",
  "already_sold",
  "duplicate",
  "inappropriate",
  "other",
] as const

export const reportSchema = z
  .object({
    reason: z.enum(reportReasons, { error: "validation.required" }),
    details: z.string().trim().max(500, "validation.too_long").optional(),
  })
  .refine(
    (v) => v.reason !== "other" || (v.details && v.details.length >= 10),
    {
      path: ["details"],
      message: "validation.details_required",
    }
  )
export type ReportForm = z.infer<typeof reportSchema>
