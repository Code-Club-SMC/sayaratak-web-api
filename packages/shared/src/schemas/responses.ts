import { z } from "zod"

import {
  paymentSchema,
  planSchema,
  promotionSchema,
  subscriptionSchema,
} from "./billing"
import { bilingualSchema, geoSchema, idSchema, pageOf } from "./fields"
import { localeSchema } from "./locale"
import { interactionModeSchema } from "./interaction"
import { periodSchema } from "./period"

// Response shapes that are not an entity (A7, "Other response shapes").
const dayPoint = z.object({ date: z.string(), value: z.number() })

const totalsSchema = z.object({
  views: z.number().int(),
  calls: z.number().int(),
  whatsapp: z.number().int(),
  messages: z.number().int(),
  favorites: z.number().int(),
  newReviews: z.number().int(),
})
// One bucket of a report series; `date` is the bucket's first day, or its first minute for hour buckets (see `period.granularity`).
const bucketSchema = z.object({
  date: z.string(),
  views: z.number().int(),
  calls: z.number().int(),
  whatsapp: z.number().int(),
  messages: z.number().int(),
})

export const analyticsSchema = z.object({
  period: periodSchema,
  totals: totalsSchema,
  previous: totalsSchema, // the compare window (period before, or a year earlier), for the "change" on each StatCard
  // Per day for presets; per week or month for long custom ranges.
  daily: z.array(bucketSchema),
  // The compare window bucketed the same way, cut or zero-padded to `daily`'s length; `date` is its own first day.
  previousDaily: z.array(bucketSchema),
  // The first Khartoum day hourly view, call and WhatsApp counts exist for: 89 days before today, or the first day any were recorded if later (step 11.7-r2).
  hourlySince: z.string(),
  // Calls, WhatsApp taps and messages received in the period from `hourlySince`, per Khartoum weekday and hour: index `weekday * 24 + hour`, weekday 0 is Sunday.
  contactHours: z.array(z.number().int()).length(168),
  // Dealerships only, otherwise []; up to 10.
  topListings: z.array(
    z.object({
      id: idSchema,
      slug: z.string(),
      title: z.string(),
      coverUrl: z.string().nullable(),
      views: z.number().int(),
      contacts: z.number().int(),
    })
  ),
})
export type Analytics = z.infer<typeof analyticsSchema>

export const adminStatsSchema = z.object({
  period: periodSchema,
  totals: z.object({
    users: z.number().int(),
    listings: z.number().int(),
    vehicles: z.number().int(),
    dealerships: z.number().int(),
    workshops: z.number().int(),
    mechanics: z.number().int(),
    activeSubscriptions: z.number().int(),
    revenue: z.number().int(), // SDG, approved payments in range
  }),
  series: z.object({
    newListings: z.array(dayPoint),
    newUsers: z.array(dayPoint),
    revenue: z.array(dayPoint),
    // What joined each total card per day (current window only): approved listings and vehicles by creation, profiles by creation, active subscriptions by start.
    newLiveListings: z.array(dayPoint),
    newVehicles: z.array(dayPoint),
    newDealerships: z.array(dayPoint),
    newWorkshops: z.array(dayPoint),
    newMechanics: z.array(dayPoint),
    newSubscriptions: z.array(dayPoint),
  }),
  // The compare window, bucketed and aligned like `series`; `previousRevenue` is its total.
  previousSeries: z.object({
    newListings: z.array(dayPoint),
    newUsers: z.array(dayPoint),
    revenue: z.array(dayPoint),
  }),
  previousRevenue: z.number().int(),
})
export type AdminStats = z.infer<typeof adminStatsSchema>

export const mapPointSchema = z.object({
  interactionMode: interactionModeSchema.default("live"),
  id: idSchema,
  kind: z.enum(["vehicle", "dealership", "workshop", "mechanic"]),
  title: bilingualSchema,
  slug: z.string(),
  location: geoSchema,
  price: z.number().int().nullable(),
  rating: z.number().nullable(),
  photoUrl: z.string().nullable(),
})
export type MapPoint = z.infer<typeof mapPointSchema>
export const mapResponseSchema = z.object({
  items: z.array(mapPointSchema),
  total: z.number().int(),
}) // items is capped at 300

export const checkoutSchema = z.object({
  itemType: z.enum(["plan", "promotion", "campaign"]),
  itemId: idSchema,
  itemLabel: bilingualSchema,
  amount: z.number().int(),
  durationDays: z.number().int(),
  reference: z.string(), // payment reference code the customer writes in the transfer note
  bankak: z.object({ name: z.string(), number: z.string() }),
  pendingPaymentId: idSchema.nullable(), // set when a payment for this item is already waiting for review
})
export type Checkout = z.infer<typeof checkoutSchema>

export const siteSchema = z.object({
  demoActive: z.boolean().default(false),
  contact: z.object({
    phone: z.string(),
    whatsapp: z.string(),
    email: z.string(),
    address: z.string(),
  }),
  locales: z.array(localeSchema),
})
export type Site = z.infer<typeof siteSchema>

// One public page for the sitemap: `path` has no locale prefix ("" is the home page).
export const sitemapEntrySchema = z.object({
  path: z.string(),
  lastmod: z.string().optional(),
})
export type SitemapEntry = z.infer<typeof sitemapEntrySchema>

export const meSubscriptionSchema = z.object({
  subscription: subscriptionSchema.nullable(), // the active one, else the pending one, else null
  plan: planSchema.nullable(), // the plan of `subscription`
  usage: z.object({
    used: z.number().int(),
    limit: z.number().int().nullable(),
  }), // limit null means no limit, and every limit meter hides
  credits: z.object({ total: z.number().int(), left: z.number().int() }), // featured credits of the active plan this period; total 0 when the plan has none
  reviewPlan: planSchema.nullable().default(null), // a plan whose payment waits for review
})
export type MeSubscription = z.infer<typeof meSubscriptionSchema>

export const activityItemSchema = z.object({
  id: idSchema,
  type: z.enum([
    "listing_submitted",
    "business_joined",
    "payment_submitted",
    "report_filed",
  ]),
  label: bilingualSchema, // listing title, business name or payment reference
  href: z.string(), // admin path of the matching screen with the item selected
  createdAt: z.string(),
})
export type ActivityItem = z.infer<typeof activityItemSchema>
export const activitySchema = z.object({ items: z.array(activityItemSchema) }) // newest first, at most 10

const searchHit = z.object({
  id: idSchema,
  label: bilingualSchema,
  detail: z.string().nullable(),
  href: z.string(),
})
export const adminSearchSchema = z.object({
  listings: z.array(searchHit),
  users: z.array(searchHit),
  businesses: z.array(searchHit),
  payments: z.array(searchHit),
}) // at most 5 each
export type AdminSearch = z.infer<typeof adminSearchSchema>
export const estimateSchema = z.object({ count: z.number().int() }) // broadcast recipients

export const myPromotionSchema = promotionSchema.extend({
  listing: z.object({
    id: idSchema,
    slug: z.string(),
    title: z.string(),
    coverUrl: z.string().nullable(),
  }),
  price: z.number().int(), // what was paid or is due; 0 for an admin grant
  paymentStatus: z.enum(["none", "pending_review", "approved", "rejected"]),
})
export type MyPromotion = z.infer<typeof myPromotionSchema>
export const myPromotionsSchema = z.object({
  items: z.array(myPromotionSchema),
}) // GET /me/promotions, newest first

// One payment row for the admin: the payer's account name, and what approval starts (13.10). `listing` is set for a promotion whose listing still exists.
export const adminPaymentSchema = paymentSchema.extend({
  user: z.object({ id: idSchema, name: z.string() }),
  order: z.object({
    durationDays: z.number().int(),
    promotionType: promotionSchema.shape.type.optional(),
    listing: z.object({ slug: z.string(), title: z.string() }).optional(),
  }),
})
export type AdminPayment = z.infer<typeof adminPaymentSchema>
export const adminPaymentsPageSchema = pageOf(adminPaymentSchema).extend({
  summary: z.object({
    approvedThisMonth: z.number().int(),
    pendingCount: z.number().int(),
    pendingAmount: z.number().int(),
  }), // SDG, calendar month in Africa/Khartoum
})
export type AdminPaymentsPage = z.infer<typeof adminPaymentsPageSchema>
