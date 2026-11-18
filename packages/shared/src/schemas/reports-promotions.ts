import { z } from "zod"

import { adPageIdSchema } from "./ads"
import { idSchema } from "./fields"
import { promotionTypeSchema } from "./listing"
import { periodSchema } from "./period"

// Views and contacts (calls + WhatsApp + messages received) of a listing over `days` (fractional).
const stretchSchema = z.object({
  days: z.number(),
  views: z.number().int(),
  contacts: z.number().int(),
})

// One promotion that ran inside the period (step 11.7-r6, owner 2026-11-18): the time it ran (a bump counts 3 days) against the same length just before it.
const promotionReportRowSchema = z.object({
  id: idSchema,
  listingId: idSchema,
  slug: z.string(),
  title: z.string(),
  coverUrl: z.string().nullable(),
  type: promotionTypeSchema,
  source: z.enum(["paid", "admin_grant", "credit"]),
  startsAt: z.string(),
  // Where the "during" stretch ends: the promotion's end (3 days after a bump), now, or the next promotion of the listing, whichever comes first.
  endsAt: z.string(),
  // SDG paid; null for an admin grant or a credit.
  amount: z.number().int().nullable(),
  before: stretchSchema,
  during: stretchSchema,
  // Contacts above what the before-rate would have brought; null when there is no "before" stretch.
  extraContacts: z.number().int().nullable(),
  // SDG per extra contact; null when free or no extra contacts.
  costPerExtraContact: z.number().int().nullable(),
})
export type PromotionReportRow = z.infer<typeof promotionReportRowSchema>

const campaignBucketSchema = z.object({
  date: z.string(),
  impressions: z.number().int(),
  clicks: z.number().int(),
})

// A paid banner campaign that ran inside the period, with its counts inside the period per bucket.
const campaignReportRowSchema = z.object({
  id: idSchema,
  imageUrl: z.string(),
  pages: z.array(adPageIdSchema),
  startsAt: z.string(),
  endsAt: z.string(),
  amount: z.number().int(),
  impressions: z.number().int(),
  clicks: z.number().int(),
  // Clicks per impression in the period, percent with one decimal; null without impressions.
  ctr: z.number().nullable(),
  // SDG per click over the whole campaign; null before its first click.
  costPerClick: z.number().int().nullable(),
  daily: z.array(campaignBucketSchema),
})
export type CampaignReportRow = z.infer<typeof campaignReportRowSchema>

export const promotionsReportSchema = z.object({
  period: periodSchema,
  summary: z.object({
    // SDG paid for the promotions listed.
    spent: z.number().int(),
    extraContacts: z.number().int(),
    costPerExtraContact: z.number().int().nullable(),
  }),
  promotions: z.array(promotionReportRowSchema),
  campaigns: z.array(campaignReportRowSchema),
})
export type PromotionsReport = z.infer<typeof promotionsReportSchema>
