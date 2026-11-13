import type { SeedPart } from "@sayaratak/shared/schemas/seed-manifest"

import {
  seedCity,
  seedListingId,
  seedOwner,
} from "./admin-seed.identity.service"

const PARTS = [
  {
    category: "brakes",
    en: "Front brake pad set",
    ar: "طقم تيل فرامل أمامي",
    visual:
      "four unbranded automotive disc brake pads, black backing plates and clean friction surfaces",
  },
  {
    category: "filters-oils",
    en: "Engine air filter",
    ar: "فلتر هواء للمحرك",
    visual:
      "one unbranded rectangular pleated paper engine air filter with an orange rubber perimeter",
  },
  {
    category: "suspension",
    en: "Front shock absorber pair",
    ar: "زوج مساعدين أماميين",
    visual:
      "two unbranded black telescopic automotive shock absorbers with matching mounting eyes",
  },
  {
    category: "electrical",
    en: "12-volt alternator",
    ar: "دينمو 12 فولت",
    visual:
      "one unbranded automotive alternator, cast aluminium casing, vent slots and black pulley",
  },
  {
    category: "body-lights",
    en: "Headlamp assembly",
    ar: "مجموعة مصباح أمامي",
    visual:
      "one unbranded halogen automotive headlamp assembly with a clear lens and black rear housing",
  },
]

/** Builds 25 new spare-part offers without invented fitment or genuine-brand claims. */
export function buildSeedParts(): SeedPart[] {
  return Array.from({ length: 25 }, (_, index) => {
    const part = PARTS[index % PARTS.length] ?? PARTS[0]
    if (!part) return []
    return {
      id: seedListingId(150 + index),
      kind: "part",
      group: "parts",
      ownerId: seedOwner(index % 10, "dealership").id,
      name: {
        en: `${part.en} · ${index + 1}`,
        ar: `${part.ar} · ${index + 1}`,
      },
      description: {
        en: `${part.en}, supplied as pictured. Compare dimensions, mounting points and the removed component before choosing compatibility. No manufacturer certification or vehicle-specific fitment is claimed.`,
        ar: `${part.ar} بالحالة الموضحة في الصور. تُراجع الأبعاد ونقاط التثبيت والقطعة القديمة قبل تحديد التوافق. لا يتضمن الوصف اعتماداً من جهة مصنعة أو ضماناً للتوافق مع موديل محدد.`,
      },
      cityId: seedCity(index),
      price: 35_000 + index * 7_500,
      condition: "new",
      partCategoryId: part.category,
      compatibleTypes: ["car"],
      visualDescription: part.visual,
    } satisfies SeedPart
  }).flat()
}
