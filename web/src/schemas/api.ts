import { z } from "zod"

export const eventTypeSchema = z.enum([
  "view",
  "phone_click",
  "whatsapp_click",
  "share",
  "banner_click",
  "banner_view",
])
export type EventType = z.infer<typeof eventTypeSchema>

export const notificationPrefsSchema = z.object({
  messages: z.boolean(),
  listings: z.boolean(),
  savedSearches: z.boolean(),
  reviews: z.boolean(),
  marketing: z.boolean(),
})
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>

export const okSchema = z.object({ ok: z.literal(true) })
export const identifySchema = z.object({
  exists: z.boolean(),
  hasPassword: z.boolean(),
})
export const draftSchema = z.object({ data: z.record(z.string(), z.unknown()) })
export const rangeSchema = z.enum(["7d", "30d", "90d"]).catch("30d")
export type Range = z.infer<typeof rangeSchema>

export const uploadSchema = z.object({
  id: z.string(),
  url: z.string(),
  type: z.enum(["image", "video", "file"]),
  name: z.string(),
  size: z.number().int(),
})
export type Upload = z.infer<typeof uploadSchema>

export const countsSchema = z.object({
  unreadMessages: z.number().int(),
  unreadNotifications: z.number().int(),
  pendingListings: z.number().int().optional(),
  pendingPayments: z.number().int().optional(),
  pendingVerifications: z.number().int().optional(),
  openReports: z.number().int().optional(),
})
export type Counts = z.infer<typeof countsSchema>

export const analyticsSchema = z.object({
  range: z.enum(["7d", "30d", "90d"]),
  totals: z.object({
    views: z.number(),
    phoneClicks: z.number(),
    whatsappClicks: z.number(),
    shares: z.number(),
    favorites: z.number(),
  }),
  series: z.array(
    z.object({
      day: z.string(),
      views: z.number(),
      phoneClicks: z.number(),
      whatsappClicks: z.number(),
    })
  ),
  top: z.array(
    z.object({ id: z.string(), title: z.string(), views: z.number() })
  ),
})
export type Analytics = z.infer<typeof analyticsSchema>

export const mapPointSchema = z.object({
  id: z.string(),
  layer: z.enum(["vehicles", "dealerships", "workshops", "mechanics"]),
  lat: z.number(),
  lng: z.number(),
  title: z.string(),
  price: z.number().int().optional(),
  image: z.string().optional(),
  href: z.string(),
})
export type MapPoint = z.infer<typeof mapPointSchema>

export const adminStatsSchema = z.object({
  users: z.number(),
  listings: z.number(),
  businesses: z.number(),
  pendingListings: z.number(),
  pendingPayments: z.number(),
  pendingVerifications: z.number(),
  openReports: z.number(),
  activeSubscriptions: z.number(),
  revenue: z.number(),
  newUsers7d: z.number(),
  newListings7d: z.number(),
})
export const adminSeriesSchema = z.array(
  z.object({
    day: z.string(),
    users: z.number(),
    listings: z.number(),
    views: z.number(),
  })
)
export const activitySchema = z.array(
  z.object({
    id: z.string(),
    type: z.enum(["listing", "user", "payment", "report", "verification"]),
    subject: z.string(),
    createdAt: z.string(),
    href: z.string(),
  })
)
export const adminSearchSchema = z.object({
  listings: z.array(z.object({ id: z.string(), title: z.string() })),
  users: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      phone: z.string().optional(),
      email: z.string().optional(),
    })
  ),
  businesses: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["dealership", "workshop", "mechanic"]),
    })
  ),
  payments: z.array(z.object({ id: z.string(), reference: z.string() })),
})
export const adminBusinessSchema = z.object({
  id: z.string(),
  type: z.enum(["dealership", "workshop", "mechanic"]),
  name: z.string(),
  ownerId: z.string(),
  cityId: z.string(),
  verified: z.boolean(),
  status: z.enum(["active", "suspended"]),
  createdAt: z.string(),
})
export const broadcastSchema = z.object({
  id: z.string(),
  audience: z.enum(["all", "user", "dealership", "workshop", "mechanic"]),
  title: z.string(),
  body: z.string(),
  recipients: z.number().int(),
  createdAt: z.string(),
})
export const taxonomyTypeSchema = z.enum([
  "cities",
  "districts",
  "makes",
  "models",
  "vehicle-types",
  "part-categories",
  "countries",
])
export const taxonomyRowSchema = z.object({ id: z.string() }).passthrough()
