import type { FieldValues } from "react-hook-form"

import type { Taxonomy } from "@/schemas/taxonomy"
import type { VehicleType } from "@/schemas/listing"
import { detailsDefaults } from "./wizard-defaults"

// One tile per type: the five vehicle types and spare parts.
export type Tile = VehicleType | "part"
export const tiles: Tile[] = [
  "car",
  "truck",
  "motorcycle",
  "tuk_tuk",
  "rickshaw",
  "part",
]

export const tileOf = (values: FieldValues): Tile | null =>
  values.kind === "part" ? "part" : (values.vehicleType ?? null)

const engineTypes: Tile[] = ["motorcycle", "tuk_tuk", "rickshaw"]
// Whether a details field means anything for the type. Title, description, price and the like always do.
function applies(field: string, tile: Tile, intent: string) {
  switch (field) {
    case "year":
    case "mileageKm":
    case "fuel":
    case "color":
      return tile !== "part"
    case "transmission":
      return tile === "car" || tile === "truck"
    case "engineCc":
      return engineTypes.includes(tile)
    case "payloadTons":
      return tile === "truck"
    case "partNumber":
      return tile === "part"
    case "rentPeriod":
      return intent === "rent"
    default:
      return true
  }
}

// A part is always for sale. Details that do not apply to the new type go back to their defaults, and so do make and model when that make does not come in the new vehicle type. The rest (title, description, price, photos) stays.
export function applyTile(
  values: FieldValues,
  tile: Tile,
  makes: Taxonomy["makes"]
): FieldValues {
  const part = tile === "part"
  const next: FieldValues = {
    ...values,
    kind: part ? "part" : "vehicle",
    vehicleType: part ? null : tile,
    intent: part ? "sale" : values.intent,
    partCategoryId: part ? values.partCategoryId : null,
    compatibleTypes: part ? values.compatibleTypes : [],
  }
  for (const [field, empty] of Object.entries(detailsDefaults))
    if (!applies(field, tile, next.intent)) next[field] = empty
  const make = makes.find((m) => m.id === next.makeId)
  if (!part && make && !make.vehicleTypes.includes(tile)) {
    next.makeId = null
    next.modelId = null
  }
  return next
}

const blank = (v: unknown) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0)

// True once any details field differs from its default.
export const detailsTouched = (values: FieldValues) =>
  Object.entries(detailsDefaults).some(([field, empty]) => {
    const value: unknown = values[field]
    return (
      !(blank(value) && blank(empty)) &&
      JSON.stringify(value) !== JSON.stringify(empty)
    )
  })
