import { z } from "zod"

import { optional } from "@/features/search/schemas"
import { requiredText } from "@/schemas/fields"
import { banInputSchema } from "@/schemas/inputs"

// A decision the admin writes down: a rejection, a dismissal note, a suspension.
export const reasonSchema = z.object({ reason: requiredText(300) })
export type ReasonForm = z.infer<typeof reasonSchema>

// The wire body of `POST /admin/users/:id/ban`; 7d and 30d end the ban on their own.
export const banSchema = banInputSchema
export type BanForm = z.infer<typeof banSchema>
export const banDurations = banSchema.shape.duration.options

// What every admin table keeps in the URL. Pages extend it with their own filters; `id` is the row open in the side sheet.
export const adminTableSearchSchema = z.object({
  q: optional(z.string().trim().max(60)),
  sort: optional(z.string().max(40)),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  id: optional(z.string().max(60)),
})
export const adminTableSearchDefaults = { page: 1 } as const
export type AdminTableSearch = z.infer<typeof adminTableSearchSchema>
