import { z } from "zod"

export const roleChoiceSchema = z.object({
  role: z.enum(["user", "dealership", "workshop", "mechanic"]),
})
export type RoleChoice = z.infer<typeof roleChoiceSchema>

export const roleDraftKey = "onboarding:role"

// Step 5.9 replaces this with `flows.ts`; the first step id of each flow is all 5.8 needs.
export const firstStep = {
  user: "details",
  dealership: "business",
  workshop: "business",
  mechanic: "about",
} as const satisfies Record<RoleChoice["role"], string>
