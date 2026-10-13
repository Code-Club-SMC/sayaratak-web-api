import { z } from "zod"

import {
  dealerBusinessSchema,
  dealerLocationSchema,
  hoursStepSchema,
} from "@/features/onboarding/schemas"
import type { Dealership } from "@/schemas/profile"

// One schema per profile section, picked from the onboarding schemas so the rules stay in one place.
// The images are stored as urls here (onboarding drafts keep upload ids instead).
const { name, description } = dealerBusinessSchema.shape
export const brandingSchema = z.object({
  logoUrl: z.string(),
  coverUrl: z.string(),
})
export const detailsSchema = z.object({
  name: z.object({ ar: name, en: name }),
  description: z.object({ ar: description, en: description }),
})
export const contactSchema = dealerLocationSchema.pick({
  phones: true,
  whatsapp: true,
})
export const locationSchema = dealerLocationSchema.pick({
  cityId: true,
  districtId: true,
  address: true,
  location: true,
})
export const hoursSchema = hoursStepSchema

// The form values of each section from the saved dealership.
export const brandingValues = (d: Dealership) => ({
  logoUrl: d.logoUrl,
  coverUrl: d.coverUrl,
})
export const detailsValues = (d: Dealership) => ({
  name: d.name,
  description: d.description,
})
export const contactValues = (d: Dealership) => ({
  phones: d.phones.map((value) => ({ value })),
  whatsapp: d.whatsapp ?? "",
})
export const locationValues = (d: Dealership) => ({
  cityId: d.cityId,
  districtId: d.districtId,
  address: d.address,
  location: d.location,
})
export const hoursValues = (d: Dealership) => ({ hours: d.hours })

export const contactBody = (v: z.output<typeof contactSchema>) => ({
  phones: v.phones.map((p) => p.value),
  whatsapp: v.whatsapp || null,
})
