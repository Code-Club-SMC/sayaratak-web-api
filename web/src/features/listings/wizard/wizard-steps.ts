import { detailsSchema, typeStepSchema } from "../schemas"
import { DetailsStep } from "./details-step"
import { TypeStep } from "./type-step"
import type { WizardStep } from "./wizard-config"

// The steps built so far, in order. 7.4 to 7.6 add photos, contact and review.
export const wizardSteps: WizardStep[] = [
  {
    id: "type",
    labelKey: "post.step_type",
    titleKey: "post.type_title",
    Component: TypeStep,
    schema: () => typeStepSchema,
  },
  {
    id: "details",
    labelKey: "post.step_details",
    titleKey: "post.details_title",
    Component: DetailsStep,
    schema: ({ kind, vehicleType, intent }) =>
      detailsSchema({ kind, vehicleType, intent }),
  },
]
