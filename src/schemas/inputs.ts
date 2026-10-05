import { z } from "zod"

import {
  emailSchema,
  geoSchema,
  identifierSchema,
  localeSchema,
  nameSchema,
  optionalText,
  optionalInt,
  passwordSchema,
  phoneSchema,
  priceSchema,
  requiredText,
  roleSchema,
  yearSchema,
} from "./fields"
import {
  fuelSchema,
  intentSchema,
  listingStatusSchema,
  mediaSchema,
  moderationSchema,
  promotionTypeSchema,
  transmissionSchema,
  vehicleTypeSchema,
} from "./listing"
import { targetTypeSchema } from "./review"
import { interestSchema } from "./user"
import { searchParamsSchema } from "@/features/search/schemas"

// Request bodies. Messages are i18n keys, as everywhere else.
export const identifyInputSchema = z.object({ identifier: identifierSchema })
export const loginInputSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "validation.required"),
})
export const registerInputSchema = z.object({
  identifier: identifierSchema,
  fullName: nameSchema,
  password: passwordSchema,
})
export const oauthInputSchema = z.object({
  accountId: z.string().min(1, "validation.required"),
})
export const otpSendInputSchema = z.object({
  identifier: z.string().optional(),
})
export const otpVerifyInputSchema = z.object({
  code: z.string().min(1, "validation.otp"),
  identifier: z.string().optional(),
})
export const forgotInputSchema = z.object({ identifier: identifierSchema })
export const resetInputSchema = z.object({
  identifier: identifierSchema,
  token: z.string().min(1, "validation.required"),
  password: passwordSchema,
})
export const profilePatchSchema = z
  .object({
    fullName: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    avatarUrl: z.string(),
    cityId: z.string(),
    interests: z.array(interestSchema),
    locale: localeSchema,
  })
  .partial()
export const passwordInputSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: passwordSchema,
})
export const draftInputSchema = z.object({
  data: z.record(z.string(), z.unknown()),
})
export const onboardingInputSchema = z.object({
  role: roleSchema.exclude(["admin"]),
  payload: z.record(z.string(), z.unknown()).default({}),
})
export const notificationPrefsInputSchema = z
  .object({
    messages: z.boolean(),
    listings: z.boolean(),
    savedSearches: z.boolean(),
    reviews: z.boolean(),
    marketing: z.boolean(),
  })
  .partial()

const listingFields = z.object({
  kind: z.enum(["vehicle", "part"]),
  intent: intentSchema,
  vehicleType: vehicleTypeSchema.nullable(),
  title: requiredText(120),
  description: optionalText(4000),
  price: priceSchema,
  negotiable: z.boolean(),
  rentPeriod: z.enum(["day", "week", "month"]).nullable(),
  condition: z.enum(["new", "used"]),
  makeId: z.string().nullable(),
  modelId: z.string().nullable(),
  makeOther: z.string().nullable(),
  modelOther: z.string().nullable(),
  year: yearSchema.nullable(),
  mileageKm: optionalInt(0, 5_000_000),
  fuel: fuelSchema.nullable(),
  transmission: transmissionSchema.nullable(),
  color: z.string().nullable(),
  engineCc: z.number().nullable(),
  payloadTons: z.number().nullable(),
  partCategoryId: z.string().nullable(),
  compatibleTypes: z.array(vehicleTypeSchema),
  media: z.array(mediaSchema),
  cityId: z.string().min(1, "validation.required"),
  districtId: z.string().nullable(),
  location: geoSchema.nullable(),
  contact: z.object({
    phone: phoneSchema,
    whatsapp: phoneSchema.nullable(),
    showPhone: z.boolean(),
    methods: z
      .array(z.enum(["call", "whatsapp", "chat"]))
      .min(1, "validation.contact_required"),
  }),
  // true sends the listing to review (or publishes it for verified dealers), false keeps it a draft.
  submit: z.boolean(),
})
export const listingCreateSchema = listingFields
  .partial()
  .required({ title: true, price: true, cityId: true })
export const listingPatchSchema = listingFields
  .partial()
  .extend({ moderation: moderationSchema.optional() })
export const listingStatusInputSchema = z.object({
  status: listingStatusSchema,
})

export const reviewInputSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().min(1),
  rating: z.number().int().min(1, "validation.rating_required").max(5),
  body: z
    .string()
    .trim()
    .min(10, "validation.review_min")
    .max(1000, "validation.too_long")
    .optional(),
})
export const reviewPatchSchema = reviewInputSchema
  .pick({ rating: true, body: true })
  .partial()
export const replyInputSchema = z.object({
  body: z
    .string()
    .trim()
    .min(2, "validation.message_min")
    .max(1000, "validation.too_long"),
})

export const favoriteInputSchema = z.object({ listingId: z.string().min(1) })
export const savedSearchInputSchema = z.object({
  name: requiredText(60),
  params: searchParamsSchema,
  alerts: z.boolean().default(true),
})
export const savedSearchPatchSchema = z
  .object({
    name: requiredText(60),
    alerts: z.boolean(),
    markSeen: z.boolean(),
  })
  .partial()

export const threadInputSchema = z.object({
  subjectType: z.enum(["listing", "dealership", "workshop", "mechanic"]),
  subjectId: z.string().min(1),
  body: z
    .string()
    .trim()
    .min(1, "validation.message_min")
    .max(2000, "validation.too_long"),
})
export const messageInputSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "validation.message_min")
    .max(2000, "validation.too_long"),
})
export const readInputSchema = z.object({ ids: z.array(z.string()).optional() })

export const promotionInputSchema = z.object({
  listingId: z.string().min(1),
  type: promotionTypeSchema,
})
export const reportInputSchema = z.object({
  listingId: z.string().min(1),
  reason: z.enum([
    "scam",
    "wrong_category",
    "already_sold",
    "duplicate",
    "inappropriate",
    "other",
  ]),
  details: z.string().trim().max(1000, "validation.too_long").optional(),
})
export const verificationInputSchema = z.object({
  documents: z
    .array(z.object({ label: z.string().min(1), url: z.string().min(1) }))
    .min(1, "validation.media_min"),
  note: z.string().max(500, "validation.too_long").optional(),
})
export const contactInputSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  message: z
    .string()
    .trim()
    .min(10, "validation.message_min")
    .max(2000, "validation.too_long"),
})
export const eventInputSchema = z.object({
  type: z.enum([
    "view",
    "phone_click",
    "whatsapp_click",
    "share",
    "banner_click",
    "banner_view",
  ]),
  targetId: z.string().min(1),
})

// Business self-service: a free-form patch limited to what each profile type can edit (checked in the handler).
export const businessPatchSchema = z.record(z.string(), z.unknown())
export const serviceInputSchema = z.object({
  name: requiredText(80),
  description: optionalText(300),
  priceFrom: optionalInt(1, 9_999_999_999, "validation.price_min"),
})
export const portfolioInputSchema = z.object({
  url: z.string().min(1, "validation.required"),
  caption: optionalText(120),
  width: z.number().default(1280),
  height: z.number().default(853),
})
export const idsInputSchema = z.object({ ids: z.array(z.string()) })
export const imagesInputSchema = z.object({
  url: z.string().min(1, "validation.required"),
})

export const rejectInputSchema = z.object({ reason: requiredText(300) })
export const noteInputSchema = z.object({
  note: z.string().max(300).optional(),
})
export const bulkInputSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["approve", "reject", "remove", "restore"]),
  reason: z.string().optional(),
})
export const banInputSchema = z.object({
  reason: z.string().max(300).optional(),
})
export const businessAdminPatchSchema = z
  .object({ status: z.enum(["active", "suspended"]), verified: z.boolean() })
  .partial()
export const assignPlanInputSchema = z.object({ planId: z.string().min(1) })
export const grantInputSchema = z.object({
  listingId: z.string().min(1),
  type: promotionTypeSchema,
  days: z.number().int().min(1).default(7),
})
export const broadcastInputSchema = z.object({
  audience: z.enum(["all", "user", "dealership", "workshop", "mechanic"]),
  title: requiredText(80),
  body: requiredText(500),
})
export const adminListingPatchSchema = listingFields
  .pick({ title: true, description: true, price: true })
  .partial()
  .extend({
    status: listingStatusSchema.optional(),
    moderation: moderationSchema.optional(),
  })
export const taxonomyInputSchema = z.record(z.string(), z.unknown())
export const bannerInputSchema = z.object({
  title: requiredText(80),
  imageUrl: z.object({ ar: z.string(), en: z.string() }),
  href: z.string().min(1, "validation.path"),
  placement: z.enum([
    "home_top",
    "home_middle",
    "search_top",
    "listing_aside",
    "directory_top",
  ]),
  startsAt: z.string(),
  endsAt: z.string(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
})
export const pagePatchSchema = z
  .object({
    title: z.object({ ar: z.string(), en: z.string() }),
    body: z.object({ ar: z.string(), en: z.string() }),
  })
  .partial()
export const settingsPatchSchema = z.record(z.string(), z.unknown())
