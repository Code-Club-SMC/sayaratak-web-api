import { createElement, type ComponentType } from "react"
import type { FieldValues } from "react-hook-form"
import { z } from "zod"

import { defaultWeeklyHours } from "@/lib/hours"
import type { User } from "@/schemas/user"
import {
  dealerBusinessSchema,
  dealerLocationSchema,
  hoursStepSchema,
  planStepSchema,
  userOnboardingSchema,
  workshopBusinessSchema,
  workshopHoursServicesSchema,
  workshopLocationSchema,
  type OnboardingRole,
} from "./schemas"
import { BusinessStep } from "./components/business-step"
import { DealerLocationStep } from "./components/dealer-location-step"
import { HoursStep } from "./components/hours-step"
import { PlanStep } from "./components/plan-step"
import { UserDetailsStep } from "./components/user-details-step"
import { WorkshopHoursServicesStep } from "./components/workshop-hours-services-step"
import { WorkshopLocationStep } from "./components/workshop-location-step"

export type FlowStep = {
  id: string
  titleKey: string
  helperKey: string
  schema: z.ZodType<FieldValues, FieldValues>
  optional?: boolean
  // Starting values for a step with no saved draft, e.g. the account name.
  defaults?: (me: User) => FieldValues
  Component: ComponentType
}

// Steps shared by the dealership and workshop flows take their audience as a prop.
const businessStep = (kind: "dealership" | "workshop") => () =>
  createElement(BusinessStep, { kind })
const planStep = (audience: "dealership" | "workshop") => () =>
  createElement(PlanStep, { audience })

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
  user: [
    {
      ...step("user", "details"),
      schema: userOnboardingSchema,
      defaults: (me) => ({
        fullName: me.fullName,
        cityId: me.cityId ?? "",
        interests: [],
      }),
      Component: UserDetailsStep,
    },
  ],
  dealership: [
    {
      ...step("dealership", "business"),
      schema: dealerBusinessSchema,
      defaults: () => ({ name: "", description: "" }),
      Component: businessStep("dealership"),
    },
    {
      ...step("dealership", "location"),
      schema: dealerLocationSchema,
      defaults: (me) => ({
        cityId: me.cityId ?? "",
        districtId: "",
        address: "",
        location: null,
        phones: [{ value: me.phone ?? "" }],
        whatsapp: "",
      }),
      Component: DealerLocationStep,
    },
    {
      ...step("dealership", "hours"),
      schema: hoursStepSchema,
      defaults: () => ({ hours: defaultWeeklyHours }),
      Component: HoursStep,
    },
    {
      ...step("dealership", "plan"),
      schema: planStepSchema,
      defaults: () => ({ planId: "" }),
      Component: planStep("dealership"),
    },
  ],
  workshop: [
    {
      ...step("workshop", "business"),
      schema: workshopBusinessSchema,
      defaults: () => ({ name: "", description: "" }),
      Component: businessStep("workshop"),
    },
    {
      ...step("workshop", "location"),
      schema: workshopLocationSchema,
      defaults: (me) => ({
        cityId: me.cityId ?? "",
        districtId: "",
        address: "",
        location: null,
        phone: me.phone ?? "",
        whatsapp: "",
      }),
      Component: WorkshopLocationStep,
    },
    {
      ...step("workshop", "hours-services"),
      schema: workshopHoursServicesSchema,
      defaults: () => ({ hours: defaultWeeklyHours, services: [] }),
      Component: WorkshopHoursServicesStep,
    },
    {
      ...step("workshop", "plan"),
      schema: planStepSchema,
      defaults: () => ({ planId: "" }),
      Component: planStep("workshop"),
    },
  ],
  mechanic: ["about", "expertise", "contact-plan"].map((id) =>
    step("mechanic", id)
  ),
} satisfies Record<OnboardingRole, FlowStep[]>

export const isRole = (value: string): value is OnboardingRole =>
  Object.hasOwn(flows, value)

export const firstStepId = (role: OnboardingRole) => flows[role][0]?.id ?? ""
