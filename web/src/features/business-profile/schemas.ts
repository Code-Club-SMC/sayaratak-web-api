import { z } from "zod"

import {
  dealerBusinessSchema,
  dealerLocationSchema,
  hoursStepSchema,
  workshopLocationSchema,
} from "@/features/onboarding/schemas"
import type { Dealership, Workshop } from "@/schemas/profile"

type Business = Dealership | Workshop

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
// A workshop has one phone where a dealership has up to three.
export const workshopContactSchema = workshopLocationSchema.pick({
  phone: true,
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
export const brandingValues = (d: Business) => ({
  logoUrl: d.logoUrl,
  coverUrl: d.coverUrl ?? "",
})
export const detailsValues = (d: Business) => ({
  name: d.name,
  description: d.description,
})
export const contactValues = (d: Dealership) => ({
  phones: d.phones.map((value) => ({ value })),
  whatsapp: d.whatsapp ?? "",
})
export const workshopContactValues = (w: Workshop) => ({
  phone: w.phone,
  whatsapp: w.whatsapp ?? "",
})
export const locationValues = (d: Business) => ({
  cityId: d.cityId,
  districtId: d.districtId,
  address: d.address,
  location: d.location,
})
export const hoursValues = (d: Business) => ({ hours: d.hours })

export const contactBody = (v: z.output<typeof contactSchema>) => ({
  phones: v.phones.map((p) => p.value),
  whatsapp: v.whatsapp || null,
})
export const workshopContactBody = (
  v: z.output<typeof workshopContactSchema>
) => ({ phone: v.phone, whatsapp: v.whatsapp || null })
