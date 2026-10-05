import { z } from "zod"

import { nameSchema } from "@/schemas/fields"
import { interestSchema } from "@/schemas/user"

export const roleChoiceSchema = z.object({
  role: z.enum(["user", "dealership", "workshop", "mechanic"]),
})
export type RoleChoice = z.infer<typeof roleChoiceSchema>
export type OnboardingRole = RoleChoice["role"]

export const roleDraftKey = "onboarding:role"
export const onboardingDraftKey = (role: OnboardingRole) => `onboarding:${role}`

export const userOnboardingSchema = z.object({
  fullName: nameSchema,
  cityId: z.string().min(1, "validation.required"),
  avatarId: z.string().optional(),
  interests: z.array(interestSchema).max(7),
})
export type UserOnboarding = z.infer<typeof userOnboardingSchema>
