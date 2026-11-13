import type {
  SeedBusiness,
  SeedOwner,
} from "@sayaratak/shared/schemas/seed-manifest"

import { seedOwner } from "./admin-seed.identity.service"

const BRANDS = [
  { en: "Sahab Lane", ar: "مسار سحاب" },
  { en: "Rimal Gate", ar: "بوابة رمال" },
  { en: "Sidr Route", ar: "درب سدر" },
  { en: "Madar Yard", ar: "ساحة مدار" },
  { en: "Bayan Road", ar: "طريق بيان" },
  { en: "Rawan Gear", ar: "رونق الحركة" },
  { en: "Safa Drive", ar: "صفا للمركبات" },
  { en: "Afaq Junction", ar: "ملتقى آفاق" },
  { en: "Nawras Motor", ar: "نورس للمحركات" },
  { en: "Darb Service", ar: "درب للخدمات" },
]
const ROLES: SeedOwner["role"][] = ["dealership", "workshop", "mechanic"]
const LABELS = {
  dealership: { en: "Motors", ar: "للسيارات" },
  workshop: { en: "Workshop", ar: "للصيانة" },
  mechanic: { en: "Technician", ar: "فني" },
}

/** Builds ten separate supporting identities for each of the three business roles. */
export function buildSeedOwners(): SeedOwner[] {
  return ROLES.flatMap((role) =>
    BRANDS.map((brand, index) => ({
      ...seedOwner(index, role),
      name: {
        en: `${brand.en} ${LABELS[role].en}`,
        ar: `${brand.ar} ${LABELS[role].ar}`,
      },
    }))
  )
}

/** Builds 30 fictional businesses with services but no ratings or verification claims. */
export function buildSeedBusinesses(): SeedBusiness[] {
  return buildSeedOwners().map((owner, index) => ({
    id: `seed-v1-business-${index + 1}`,
    ownerId: owner.id,
    name: owner.name,
    kind: owner.role,
    cityId: owner.cityId,
    description: businessDescription(owner),
    specializationIds:
      owner.role === "mechanic" ? ["engine", "diagnostics"] : [],
    serviceTemplateIds:
      owner.role === "workshop" ? ["oil-change", "brakes"] : [],
    yearsOfExperience: owner.role === "mechanic" ? 4 + (index % 10) : 0,
  }))
}

function businessDescription(owner: SeedOwner) {
  if (owner.role === "dealership")
    return {
      en: `${owner.name.en} presents a varied inventory of passenger vehicles, commercial vehicles and spare parts. Browse each inventory item's specifications, body style and images in its individual listing.`,
      ar: `${owner.name.ar} يعرض تشكيلة من سيارات الركوب والمركبات التجارية وقطع الغيار. يمكن تصفح مواصفات كل مركبة وشكل الهيكل والصور من صفحة الإعلان الخاصة بها.`,
    }
  if (owner.role === "workshop")
    return {
      en: `${owner.name.en} covers routine servicing, oil changes and brake inspection. The service list separates each task so visitors can understand the scope of workshop work.`,
      ar: `${owner.name.ar} يقدم الصيانة الدورية وتغيير الزيت وفحص الفرامل. توضح قائمة الخدمات نطاق كل عملية لتسهيل فهم أعمال الورشة وتجهيزاتها.`,
    }
  return {
    en: `${owner.name.en} focuses on engine maintenance and systematic fault diagnosis. The profile describes the areas of work and experience, with a workplace image alongside the portrait.`,
    ar: `${owner.name.ar} يركز على صيانة المحركات وتشخيص الأعطال بصورة منظمة. يوضح الملف مجالات العمل والخبرة، مع صورة لبيئة العمل بجانب الصورة الشخصية.`,
  }
}
