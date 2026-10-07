import type { FieldValues } from "react-hook-form"

// What the form holds before anyone typed. The details values are compared with these to tell whether that step was touched.
export const typeDefaults = {
  kind: "vehicle",
  vehicleType: null,
  intent: "sale",
  partCategoryId: null,
  compatibleTypes: [],
} satisfies FieldValues

export const detailsDefaults = {
  title: "",
  description: "",
  price: null,
  negotiable: false,
  rentPeriod: null,
  condition: "used",
  makeId: null,
  modelId: null,
  makeOther: null,
  modelOther: null,
  year: null,
  mileageKm: null,
  fuel: null,
  transmission: null,
  color: null,
  engineCc: null,
  payloadTons: null,
  partNumber: "",
} satisfies FieldValues

export const wizardDefaults: FieldValues = {
  ...typeDefaults,
  ...detailsDefaults,
}
