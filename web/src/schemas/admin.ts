import { z } from "zod"

import { bilingualSchema, idSchema, localeSchema } from "./fields"
import { targetTypeSchema } from "./review"

// A banner is a photo with real text on top, one set of text per language (so it reads on a phone, to a screen reader and in the admin form). `focus` is the photo's vertical focal point in percent: the crop keeps it in view. A banner without `copy` is a finished image (the older form) and shows as is.
export const bannerCopySchema = z.object({
  eyebrow: z.string(),
  heading: z.string(),
  body: z.string(),
  cta: z.string(),
})
export const bannerSchema = z.object({
  id: idSchema,
  title: z.string(),
  imageUrl: bilingualSchema,
  copy: z.object({ ar: bannerCopySchema, en: bannerCopySchema }).optional(),
  sponsored: z.boolean().default(false),
  focus: z.number().min(0).max(100).default(50),
  href: z.string(),
  placement: z.enum([
    "home_top",
    "home_middle",
    "search_top",
    "listing_aside",
    "directory_top",
  ]),
  startsAt: z.string(),
  endsAt: z.string(),
  active: z.boolean(),
  sortOrder: z.number().int(),
  impressions: z.number().int(),
  clicks: z.number().int(),
})
export type Banner = z.infer<typeof bannerSchema>

export const reportSchema = z.object({
  id: idSchema,
  listingId: idSchema,
  reporterId: idSchema,
  reason: z.enum([
    "scam",
    "wrong_category",
    "already_sold",
    "duplicate",
    "inappropriate",
    "other",
  ]),
  details: z.string().optional(),
  status: z.enum(["open", "dismissed", "actioned"]),
  createdAt: z.string(),
  resolutionNote: z.string().optional(),
})
export type Report = z.infer<typeof reportSchema>

export const verificationLabels = [
  "commercial_registration",
  "national_id",
  "workshop_license",
  "certificate",
  "shop_photo",
  "other",
] as const

export const verificationRequestSchema = z.object({
  id: idSchema,
  targetType: targetTypeSchema,
  targetId: idSchema,
  ownerId: idSchema,
  documents: z.array(
    z.object({ id: idSchema, label: z.string(), url: z.string() })
  ),
  note: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]),
  rejectionReason: z.string().optional(),
  createdAt: z.string(),
})
export type VerificationRequest = z.infer<typeof verificationRequestSchema>

export const sitePageSchema = z.object({
  slug: z.enum(["about", "contact", "privacy", "terms"]),
  title: bilingualSchema,
  body: bilingualSchema,
  updatedAt: z.string(),
})
export type SitePage = z.infer<typeof sitePageSchema>

export const settingsSchema = z.object({
  autoApproveVerifiedDealers: z.boolean(),
  listingExpiryDays: z.number().int(),
  individualSubscriptionsEnabled: z.boolean(),
  freeListingLimit: z.number().int(),
  bankakAccount: z.object({ name: z.string(), number: z.string() }),
  contact: z.object({
    phone: z.string(),
    whatsapp: z.string(),
    email: z.string(),
    address: z.string(),
  }),
  locales: z.array(localeSchema),
})
export type Settings = z.infer<typeof settingsSchema>

export const backupSchema = z.object({
  id: idSchema,
  createdAt: z.string(),
  sizeMb: z.number(),
  type: z.enum(["auto", "manual"]),
  status: z.enum(["ready", "restoring", "failed"]),
})
export type Backup = z.infer<typeof backupSchema>
