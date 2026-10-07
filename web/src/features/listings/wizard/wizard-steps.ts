import { typeStepSchema } from "../schemas"
import { TypeStep } from "./type-step"
import type { WizardStep } from "./wizard-config"

// The steps built so far, in order. 7.3 to 7.6 add details, photos, contact and review.
export const wizardSteps: WizardStep[] = [
  {
    id: "type",
    labelKey: "post.step_type",
    titleKey: "post.type_title",
    Component: TypeStep,
    schema: () => typeStepSchema,
  },
]
