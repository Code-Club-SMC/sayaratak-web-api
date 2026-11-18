import { z } from "zod"

import { periodSchema } from "./period"

// Share of market views against share of the account's live stock (step 11.7-r6, owner 2026-11-18). Shares are whole percents; a null id is "Other" (under 5 market listings).
const shareSchema = z.object({
  views: z.number().int(),
  viewShare: z.number().int(),
  stock: z.number().int(),
  stockShare: z.number().int(),
})

const demandModelSchema = shareSchema.extend({ modelId: z.string().nullable() })
const demandMakeSchema = shareSchema.extend({
  makeId: z.string().nullable(),
  models: z.array(demandModelSchema),
})
export type DemandMake = z.infer<typeof demandMakeSchema>

export const demandReportSchema = z.object({
  period: periodSchema,
  // "city": the account's city; "country": all Sudan (no city, or under 50 live listings in it).
  scope: z.enum(["city", "country"]),
  cityId: z.string().nullable(),
  totalViews: z.number().int(),
  totalStock: z.number().int(),
  makes: z.array(demandMakeSchema),
})
export type DemandReport = z.infer<typeof demandReportSchema>
