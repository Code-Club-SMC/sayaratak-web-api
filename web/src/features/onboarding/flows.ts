import type { ComponentType } from "react"
import type { FieldValues } from "react-hook-form"
import { z } from "zod"

import type { OnboardingRole } from "./schemas"

export type FlowStep = {
  id: string
  titleKey: string
  helperKey: string
  schema: z.ZodType<FieldValues, FieldValues>
  optional?: boolean
  Component: ComponentType
}

// Steps 5.10 to 5.13 replace `schema` and `Component` of each step with its real fields.
const noFields = () => null
const step = (role: OnboardingRole, id: string): FlowStep => {
  const key = `onboarding.step_${role}_${id.replaceAll("-", "_")}`
  return {
    id,
    titleKey: `${key}_title`,
    helperKey: `${key}_helper`,
    schema: z.object({}),
    Component: noFields,
  }
}

export const flows = {
  user: [step("user", "details")],
  dealership: ["business", "location", "hours", "plan"].map((id) =>
    step("dealership", id)
  ),
  workshop: ["business", "location", "hours-services", "plan"].map((id) =>
    step("workshop", id)
  ),
  mechanic: ["about", "expertise", "contact-plan"].map((id) =>
    step("mechanic", id)
  ),
} satisfies Record<OnboardingRole, FlowStep[]>

export const isRole = (value: string): value is OnboardingRole =>
  Object.hasOwn(flows, value)

export const firstStepId = (role: OnboardingRole) => flows[role][0]?.id ?? ""
