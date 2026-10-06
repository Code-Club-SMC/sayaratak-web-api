import { z } from "zod"

import { geoSchema, idSchema, phoneSchema, weeklyHoursSchema } from "./fields"
import { mediaSchema } from "./listing"
import { ratingSchema } from "./review"

export const profileStatusSchema = z.enum(["active", "suspended"])
export type ProfileStatus = z.infer<typeof profileStatusSchema>

// A map pin is optional when a business signs up, and so is a WhatsApp number.
export const dealershipSchema = z.object({
  id: idSchema,
  slug: z.string(),
  ownerId: idSchema,
  name: z.string(),
  logoUrl: z.string(),
  coverUrl: z.string(),
  description: z.string(),
  cityId: z.string(),
  districtId: z.string(),
  address: z.string(),
  location: geoSchema.nullable(),
  phones: z.array(phoneSchema),
  whatsapp: phoneSchema.nullable(),
  hours: weeklyHoursSchema,
  rating: ratingSchema,
  verified: z.boolean(),
  inventoryCount: z.number().int(),
  status: profileStatusSchema,
  createdAt: z.string(),
})
export type Dealership = z.infer<typeof dealershipSchema>

export const workshopSchema = z.object({
  id: idSchema,
  slug: z.string(),
  ownerId: idSchema,
  name: z.string(),
  logoUrl: z.string(),
  coverUrl: z.string().optional(),
  description: z.string(),
  cityId: z.string(),
  districtId: z.string(),
  address: z.string(),
  location: geoSchema.nullable(),
  phone: phoneSchema,
  whatsapp: phoneSchema.nullable(),
  hours: weeklyHoursSchema,
  images: z.array(mediaSchema),
  services: z.array(
    z.object({
      id: idSchema,
      name: z.string(),
      description: z.string(),
      priceFrom: z.number().int().optional(),
      // Set when the service was picked from the service templates, null for a custom one. The directory `service` filter matches on it.
      templateId: z.string().nullable(),
    })
  ),
  rating: ratingSchema,
  verified: z.boolean(),
  status: profileStatusSchema,
  createdAt: z.string(),
})
export type Workshop = z.infer<typeof workshopSchema>

export const mechanicSchema = z.object({
  id: idSchema,
  slug: z.string(),
  ownerId: idSchema,
  name: z.string(),
  photoUrl: z.string(),
  bio: z.string(),
  cityId: z.string(),
  servedCityIds: z.array(z.string()),
  yearsOfExperience: z.number().int(),
  specializationIds: z.array(z.string()),
  phone: phoneSchema,
  whatsapp: phoneSchema.nullable(),
  portfolio: z.array(
    z.object({
      id: idSchema,
      url: z.string(),
      caption: z.string(),
      width: z.number(),
      height: z.number(),
      placeholderColor: z.string(),
    })
  ),
  available: z.boolean(),
  rating: ratingSchema,
  verified: z.boolean(),
  status: profileStatusSchema,
  createdAt: z.string(),
})
export type Mechanic = z.infer<typeof mechanicSchema>
