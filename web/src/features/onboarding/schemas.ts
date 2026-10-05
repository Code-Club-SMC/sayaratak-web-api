import { z } from "zod"

export const roleChoiceSchema = z.object({
  role: z.enum(["user", "dealership", "workshop", "mechanic"]),
})
export type RoleChoice = z.infer<typeof roleChoiceSchema>
export type OnboardingRole = RoleChoice["role"]

export const roleDraftKey = "onboarding:role"
export const onboardingDraftKey = (role: OnboardingRole) => `onboarding:${role}`
