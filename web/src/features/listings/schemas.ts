import { z } from "zod"

import { intentSchema, vehicleTypeSchema } from "@/schemas/listing"

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

// Step `type` of the post wizard.
export const typeStepSchema = z
  .object({
    kind: z.enum(["vehicle", "part"]),
    vehicleType: vehicleTypeSchema.nullable(),
    intent: intentSchema,
    partCategoryId: z.string().nullable(),
    compatibleTypes: z.array(vehicleTypeSchema),
  })
  .superRefine((v, ctx) => {
    const need = (
      ok: boolean,
      path: string,
      message = "validation.required"
    ) => {
      if (!ok) ctx.addIssue({ code: "custom", path: [path], message })
    }
    if (v.kind === "vehicle") need(v.vehicleType !== null, "vehicleType")
    if (v.kind === "part") {
      need(v.partCategoryId !== null, "partCategoryId")
      need(
        v.compatibleTypes.length > 0,
        "compatibleTypes",
        "validation.select_min"
      )
    }
  })
