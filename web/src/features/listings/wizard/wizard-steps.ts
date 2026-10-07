import {
  contactStepSchema,
  detailsSchema,
  photosStepSchema,
  typeStepSchema,
} from "../schemas"
import { ContactStep } from "./contact-step"
import { DetailsStep } from "./details-step"
import { PhotosStep } from "./photos-step"
import { TypeStep } from "./type-step"
import type { WizardStep } from "./wizard-config"

// The steps built so far, in order. 7.6 adds review.
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
  {
    id: "photos",
    labelKey: "post.step_photos",
    titleKey: "post.photos_title",
    Component: PhotosStep,
    schema: () => photosStepSchema,
  },
  {
    id: "contact",
    labelKey: "post.step_contact",
    titleKey: "post.contact_title",
    Component: ContactStep,
    schema: () => contactStepSchema,
  },
]
