import { z } from "zod"

import { bannerSchema } from "./admin"
import { adPageIdSchema } from "./ads"
import { idSchema } from "./fields"
import { periodSchema } from "./period"

// Admin Insights Ads tab (step 11.7-r12b, owner 2026-11-19): banner views and clicks of paid campaigns and admin banners, and how full the paid slots were. Slot fill counts approved campaigns only: slot-days held / (slots x days in the period); admin banners use no slots.

const int = z.number().int()
const countSchema = z.object({ count: int, previous: int })
// Clicks per view, percent with one decimal; null without views.
const ctrSchema = z.number().nullable()

const adsPoint = z.object({
  date: z.string(),
  campaignViews: int,
  campaignClicks: int,
  bannerViews: int,
  bannerClicks: int,
  campaignCtr: ctrSchema,
  bannerCtr: ctrSchema,
})
export type AdsPoint = z.infer<typeof adsPoint>

const kindTotals = z.object({
  views: countSchema,
  clicks: countSchema,
  ctr: z.object({ value: ctrSchema, previous: ctrSchema }),
})

// Fill in percent with one decimal; null when the pages hold no slots.
const fillSchema = z.object({
  pct: z.number().nullable(),
  previous: z.number().nullable(),
})

const adRowBase = z.object({
  id: idSchema,
  // The advertiser's name for a campaign, the banner's title for an admin banner.
  name: z.string(),
  startsAt: z.string(),
  endsAt: z.string(),
  views: int,
  clicks: int,
  ctr: ctrSchema,
})
const adRowSchema = z.discriminatedUnion("kind", [
  adRowBase.extend({
    kind: z.literal("campaign"),
    pages: z.array(adPageIdSchema),
  }),
  adRowBase.extend({
    kind: z.literal("banner"),
    placement: bannerSchema.shape.placement,
  }),
])
export type AdRow = z.infer<typeof adRowSchema>

const pageFillSchema = z.object({
  id: adPageIdSchema,
  slots: int,
  enabled: z.boolean(),
  // Approved campaigns on the page that ran inside the period.
  campaigns: int,
  // Days of the period each campaign held a slot, added up; one decimal.
  slotDays: z.number(),
  fill: fillSchema,
})
export type PageFill = z.infer<typeof pageFillSchema>

export const adsReportSchema = z.object({
  period: periodSchema,
  campaigns: kindTotals,
  banners: kindTotals,
  // Over pages on sale; the compare window uses today's slot counts (older counts are not kept).
  fill: fillSchema,
  series: z.array(adsPoint),
  previousSeries: z.array(adsPoint),
  pages: z.array(pageFillSchema),
  // Approved campaigns and admin banners that ran or were seen in the period, most views first.
  ads: z.array(adRowSchema),
})
export type AdsReport = z.infer<typeof adsReportSchema>
