import { z } from "zod"

import { optional } from "@/features/search/schemas"
import { requiredText } from "@/schemas/fields"
import { banInputSchema } from "@/schemas/inputs"
import { typeFilterSchema } from "@/schemas/listing"

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

// A tab kept in the URL; an unknown value falls back to the first tab. Pages that the overview links to (13.2) carry one before their own step builds them.
const tabOf = <T extends readonly [string, ...string[]]>(tabs: T) =>
  z.enum(tabs).default(tabs[0]).catch(tabs[0])
export const adminListingsSearchSchema = z.object({
  tab: tabOf(["all", "approved", "pending", "rejected", "removed"]),
  kind: optional(z.enum(["vehicle", "part"])),
})
export const reportTabs = ["open", "resolved"] as const
export const reportsSearchSchema = adminTableSearchSchema.extend({
  tab: tabOf(reportTabs),
})
export type ReportsSearch = z.infer<typeof reportsSearchSchema>
export const verificationsSearchSchema = z.object({
  tab: tabOf(["pending", "approved", "rejected"]),
})
export const paymentsSearchSchema = z.object({
  tab: tabOf(["pending", "approved", "rejected", "all"]),
})
export const plansSearchSchema = z.object({
  tab: tabOf(["user", "dealership", "workshop", "mechanic", "subscribers"]),
})

// The review queue (13.3): `listing` is the open item; below lg it also switches the screen from the list to the review.
export const sellerKinds = [
  "all",
  "individual",
  "dealership",
  "verified",
] as const
export const moderationSearchSchema = z.object({
  listing: optional(z.string().max(60)),
  type: optional(typeFilterSchema),
  sellerKind: z.enum(sellerKinds).default("all").catch("all"),
})
export type ModerationSearch = z.infer<typeof moderationSearchSchema>
