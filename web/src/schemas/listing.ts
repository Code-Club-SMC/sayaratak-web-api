import { z } from "zod"

import {
  bilingualSchema,
  geoSchema,
  idSchema,
  pageOf,
  phoneSchema,
} from "./fields"
import { extraFields } from "./listing-fields"

export const vehicleTypeSchema = z.enum([
  "car",
  "truck",
  "motorcycle",
  "tuk_tuk",
  "rickshaw",
])
export const intentSchema = z.enum(["sale", "rent"])
export const fuelSchema = z.enum([
  "petrol",
  "diesel",
  "hybrid",
  "electric",
  "lpg",
])
export const transmissionSchema = z.enum(["automatic", "manual"])
export const listingStatusSchema = z.enum([
  "available",
  "reserved",
  "sold",
  "rented",
])
export const moderationSchema = z.enum([
  "draft",
  "pending",
  "approved",
  "rejected",
  "removed",
])
export const promotionTypeSchema = z.enum([
  "pin",
  "boost",
  "homepage",
  "sponsored",
])
export type VehicleType = z.infer<typeof vehicleTypeSchema>
export type Intent = z.infer<typeof intentSchema>
export type Fuel = z.infer<typeof fuelSchema>
export type Transmission = z.infer<typeof transmissionSchema>
export type ListingStatus = z.infer<typeof listingStatusSchema>
export type Moderation = z.infer<typeof moderationSchema>
export type PromotionType = z.infer<typeof promotionTypeSchema>

// `url` is a template containing {w}; MediaImage swaps in 320, 640, 960 or 1280.
export const mediaSchema = z.object({
  id: idSchema,
  type: z.enum(["image", "video"]),
  url: z.string(),
  width: z.number(),
  height: z.number(),
  placeholderColor: z.string(),
  // Videos only: template of the first-frame image, shown before play.
  posterUrl: z.string().nullable(),
})
export type Media = z.infer<typeof mediaSchema>

export const listingSchema = z.object({
  id: idSchema,
  slug: z.string(),
  kind: z.enum(["vehicle", "part"]),
  intent: intentSchema,
  vehicleType: vehicleTypeSchema.nullable(),
  title: z.string(),
  // Typed in one language, stored in both (the server translates on save).
  description: bilingualSchema,
  price: z.number().int(),
  negotiable: z.boolean(),
  rentPeriod: z.enum(["day", "week", "month"]).nullable(),
  condition: z.enum(["new", "used"]),
  makeId: z.string().nullable(),
  modelId: z.string().nullable(),
  makeOther: z.string().nullable(),
  modelOther: z.string().nullable(),
  year: z.number().nullable(),
  mileageKm: z.number().nullable(),
  fuel: fuelSchema.nullable(),
  transmission: transmissionSchema.nullable(),
  color: z.string().nullable(),
  engineCc: z.number().nullable(),
  payloadTons: z.number().nullable(),
  partNumber: z.string().nullable(),
  ...extraFields,
  partCategoryId: z.string().nullable(),
  compatibleTypes: z.array(vehicleTypeSchema),
  media: z.array(mediaSchema),
  cityId: z.string(),
  districtId: z.string().nullable(),
  location: geoSchema.nullable(),
  status: listingStatusSchema,
  moderation: moderationSchema,
  rejectionReason: z.string().nullable(),
  promotions: z.array(
    z.object({
      type: promotionTypeSchema,
      startsAt: z.string(),
      endsAt: z.string(),
    })
  ),
  owner: z.object({
    id: idSchema,
    type: z.enum(["user", "dealership"]),
    name: bilingualSchema,
    avatarUrl: z.string().nullable(),
    verified: z.boolean(),
    memberSince: z.string(),
    profileSlug: z.string().nullable(),
  }),
  contact: z.object({
    phone: phoneSchema,
    whatsapp: phoneSchema.nullable(),
    showPhone: z.boolean(),
    methods: z.array(z.enum(["call", "whatsapp", "chat"])).min(1),
  }),
  stats: z.object({
    views: z.number(),
    favorites: z.number(),
    phoneClicks: z.number(),
    whatsappClicks: z.number(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
  expiresAt: z.string(),
})
export type Listing = z.infer<typeof listingSchema>

const facetSchema = z.array(
  z.object({ value: z.string(), count: z.number().int() })
)
export const listingPageSchema = pageOf(listingSchema).extend({
  facets: z.object({
    type: facetSchema,
    make: facetSchema,
    fuel: facetSchema,
    transmission: facetSchema,
    city: facetSchema,
  }),
})
export type ListingPage = z.infer<typeof listingPageSchema>
