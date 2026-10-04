import { z } from "zod"

import { normalizePhone } from "@/lib/phone"

export { localeSchema, type Locale } from "./locale"
export const roleSchema = z.enum([
  "user",
  "dealership",
  "workshop",
  "mechanic",
  "admin",
])
export type Role = z.infer<typeof roleSchema>
export const bilingualSchema = z.object({ ar: z.string(), en: z.string() })
export type Bilingual = z.infer<typeof bilingualSchema>
export const idSchema = z.string().min(1)

export const requiredText = (max = 120) =>
  z
    .string()
    .trim()
    .min(1, "validation.required")
    .max(max, "validation.too_long")
export const optionalText = (max = 500) =>
  z.string().trim().max(max, "validation.too_long").optional().or(z.literal(""))

export const nameSchema = z
  .string()
  .trim()
  .min(2, "validation.name_min")
  .max(80, "validation.too_long")
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("validation.email")
// Stored as E.164. PhoneInput normalizes on blur with lib/phone.ts, the schema only checks the shape.
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, "validation.phone")
export const passwordSchema = z
  .string()
  .min(8, "validation.password_min")
  .regex(/[A-Za-z؀-ۿ]/, "validation.password_letter")
  .regex(/\d/, "validation.password_digit")
// Accepts a phone or an email. Used by the first auth step.
export const identifierSchema = z
  .string()
  .trim()
  .min(1, "validation.required")
  .refine(
    (v) =>
      emailSchema.safeParse(v).success ||
      phoneSchema.safeParse(normalizePhone(v)).success,
    "validation.identifier"
  )

export const priceSchema = z.coerce
  .number({ message: "validation.number" })
  .int("validation.integer")
  .min(1, "validation.price_min")
  .max(9_999_999_999, "validation.too_large")
export const yearSchema = z.coerce
  .number({ message: "validation.number" })
  .int()
  .min(1970, "validation.year_range")
  .max(new Date().getFullYear() + 1, "validation.year_range")
export const geoSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})
export type Geo = z.infer<typeof geoSchema>
export const imageFileSchema = z
  .instanceof(File, { message: "validation.required" })
  .refine((f) => f.type.startsWith("image/"), "validation.image_type")
  .refine((f) => f.size <= 5 * 1024 * 1024, "validation.file_size_5mb")
export const hourSchema = z.object({
  day: z.number().int().min(0).max(6),
  closed: z.boolean(),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
})
export const weeklyHoursSchema = z
  .array(hourSchema)
  .length(7)
  .refine(
    (rows) => rows.every((r) => r.closed || r.open < r.close),
    "validation.hours_order"
  )
export type WeeklyHours = z.infer<typeof weeklyHoursSchema>

// Every list endpoint answers in this envelope.
export const pageOf = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
