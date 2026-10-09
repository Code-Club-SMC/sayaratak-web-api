import { createElement, type ComponentType } from "react"
import type { FieldValues } from "react-hook-form"
import type { z } from "zod"

import { defaultWeeklyHours } from "@/lib/hours"
import type { User } from "@/schemas/user"
import {
  dealerBusinessSchema,
  dealerLocationSchema,
  hoursStepSchema,
  mechanicAboutSchema,
  mechanicContactPlanSchema,
  mechanicExpertiseSchema,
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
import { MechanicAboutStep } from "./components/mechanic-about-step"
import { MechanicContactPlanStep } from "./components/mechanic-contact-plan-step"
import { MechanicExpertiseStep } from "./components/mechanic-expertise-step"
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

const step = (role: OnboardingRole, id: string) => {
  const key = `onboarding.step_${role}_${id.replaceAll("-", "_")}`
  return { id, titleKey: `${key}_title`, helperKey: `${key}_helper` }
}

export const flows = {
  user: [
    {
      ...step("user", "details"),
      schema: userOnboardingSchema,
      defaults: (me) => ({
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
  mechanic: [
    {
      ...step("mechanic", "about"),
      schema: mechanicAboutSchema,
      defaults: (me) => ({
        name: me.fullName,
        yearsOfExperience: null,
        bio: "",
      }),
      Component: MechanicAboutStep,
    },
    {
      ...step("mechanic", "expertise"),
      schema: mechanicExpertiseSchema,
      defaults: (me) => ({
        specializationIds: [],
        cityId: me.cityId ?? "",
        servedCityIds: [],
      }),
      Component: MechanicExpertiseStep,
    },
    {
      ...step("mechanic", "contact-plan"),
      schema: mechanicContactPlanSchema,
      defaults: (me) => ({
        phone: me.phone ?? "",
        whatsapp: "",
        planId: "",
      }),
      Component: MechanicContactPlanStep,
    },
  ],
} satisfies Record<OnboardingRole, FlowStep[]>

export const isRole = (value: string): value is OnboardingRole =>
  Object.hasOwn(flows, value)

export const firstStepId = (role: OnboardingRole) => flows[role][0]?.id ?? ""
