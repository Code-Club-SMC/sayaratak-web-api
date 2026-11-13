import type { Bilingual } from "@sayaratak/shared/schemas/fields"
import type { SeedOwner } from "@sayaratak/shared/schemas/seed-manifest"

const CITIES = ["khartoum", "omdurman", "bahri", "port-sudan", "kassala"]
const COLORS: Bilingual[] = [
  { en: "white", ar: "أبيض" },
  { en: "silver", ar: "فضي" },
  { en: "dark blue", ar: "أزرق داكن" },
  { en: "grey", ar: "رمادي" },
  { en: "black", ar: "أسود" },
]

/** Stable catalog identities never depend on the clock or random generators. */
export function seedListingId(index: number) {
  return `lsd${index.toString(36).padStart(3, "0")}`
}

/** Resolves a catalog location without inventing street addresses or coordinates. */
export function seedCity(index: number) {
  return CITIES[index % CITIES.length] ?? "khartoum"
}

/** Supplies the same body color to listing details and both image prompts. */
export function seedColor(index: number): Bilingual {
  return COLORS[index % COLORS.length] ?? { en: "white", ar: "أبيض" }
}

/** Gives each business its own non-authenticated supporting owner descriptor. */
export function seedOwner(index: number, role: SeedOwner["role"]): SeedOwner {
  return {
    id: `seed-v1-${role}-${index + 1}`,
    role,
    name: {
      en: `Sahab ${role} ${index + 1}`,
      ar: `سحاب ${index + 1}`,
    },
    cityId: seedCity(index),
  }
}
