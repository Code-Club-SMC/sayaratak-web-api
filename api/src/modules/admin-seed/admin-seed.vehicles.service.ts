import type { SeedVehicle } from "@sayaratak/shared/schemas/seed-manifest"

import {
  seedCity,
  seedColor,
  seedListingId,
  seedOwner,
} from "./admin-seed.identity.service"

type Configuration = Pick<
  SeedVehicle,
  | "makeId"
  | "modelId"
  | "vehicleType"
  | "fuel"
  | "transmission"
  | "engineCc"
  | "payloadTons"
> & { en: string; ar: string; firstYear: number }

const CARS: Configuration[] = [
  car(["toyota", "corolla", "Corolla", "كورولا", 1600]),
  car(["toyota", "camry", "Camry", "كامري", 2500]),
  car(["toyota", "prado", "Prado", "برادو", 2700]),
  car(["toyota", "rav4", "RAV4", "راف فور", 2000]),
  car(["hyundai", "accent", "Accent", "أكسنت", 1600]),
  car(["hyundai", "elantra", "Elantra", "النترا", 1600]),
  car(["hyundai", "tucson", "Tucson", "توسان", 2000]),
  car(["kia", "cerato", "Cerato", "سيراتو", 1600]),
  car(["kia", "sportage", "Sportage", "سبورتاج", 2000]),
  car(["nissan", "sunny", "Sunny", "صني", 1500]),
]
const TRUCKS: Configuration[] = [
  truck(["toyota", "dyna", "Dyna", "داينا"]),
  truck(["isuzu", "npr", "NPR", "إن بي آر"]),
  truck(["hyundai", "hd65", "HD65", "إتش دي 65"]),
  truck(["mitsubishi", "canter", "Canter", "كانتر"]),
]
const MOTORCYCLES: Configuration[] = [
  motorcycle(["honda", "cg125", "CG125", "سي جي 125"]),
  motorcycle(["yamaha", "ybr125", "YBR125", "واي بي آر 125"]),
  motorcycle(["tvs", "hlx-125", "HLX 125", "إتش إل إكس 125"]),
]
const TUK_TUK: Configuration = {
  makeId: "tvs",
  modelId: "tvs-king",
  en: "TVS King",
  ar: "تي في إس كينج",
  vehicleType: "tuk_tuk",
  firstYear: 2018,
  fuel: "petrol",
  transmission: "manual",
  engineCc: null,
  payloadTons: null,
}

/** Builds all 175 vehicle descriptors with fixed, taxonomy-backed configurations. */
export function buildSeedVehicles(): SeedVehicle[] {
  return [
    ...group({ group: "cars", count: 100, offset: 0 }, CARS),
    ...group({ group: "trucks", count: 20, offset: 100 }, TRUCKS),
    ...group({ group: "motorcycles", count: 20, offset: 120 }, MOTORCYCLES),
    ...group({ group: "tuk_tuks", count: 10, offset: 140 }, [TUK_TUK]),
    ...group({ group: "rentals", count: 25, offset: 175 }, CARS),
  ]
}

function group(
  plan: { group: SeedVehicle["group"]; count: number; offset: number },
  configurations: Configuration[]
) {
  return Array.from({ length: plan.count }, (_, index) => {
    const configuration = configurations[index % configurations.length]
    if (!configuration) return []
    return vehicle({ ...plan, index: plan.offset + index }, configuration)
  }).flat()
}

function vehicle(
  row: { group: SeedVehicle["group"]; index: number },
  configuration: Configuration
): SeedVehicle {
  const year = configuration.firstYear + (row.index % 3)
  const color = seedColor(row.index)
  const rental = row.group === "rentals"
  return {
    id: seedListingId(row.index),
    kind: "vehicle",
    group: row.group,
    ownerId: seedOwner(row.index % 10, "dealership").id,
    name: {
      en: `${year} ${configuration.en}`,
      ar: `${configuration.ar} ${year}`,
    },
    description: description(configuration, { year, color: color.en }),
    cityId: seedCity(row.index),
    price: priceOf(row),
    condition: "used",
    intent: rental ? "rent" : "sale",
    makeId: configuration.makeId,
    modelId: configuration.modelId,
    vehicleType: configuration.vehicleType,
    year,
    mileageKm: 55_000 + (row.index % 25) * 5_000,
    fuel: configuration.fuel,
    transmission: configuration.transmission,
    engineCc: configuration.engineCc,
    payloadTons: configuration.payloadTons,
    color,
    rentPeriod: rental ? "day" : null,
  }
}

function description(
  configuration: Configuration,
  detail: { year: number; color: string }
) {
  return {
    en: `${detail.year} ${configuration.en} in ${detail.color}. ${configuration.fuel} engine with ${configuration.transmission} transmission. Listed specifications describe this vehicle configuration; inspect the photos for body style and seating layout.`,
    ar: `${configuration.ar} موديل ${detail.year}. مواصفات المحرك وناقل الحركة موضحة في تفاصيل الإعلان. تعرض الصور شكل الهيكل وتوزيع المقاعد، وترد قراءة العداد والمواصفات في الحقول المخصصة.`,
  }
}

function priceOf(row: { group: SeedVehicle["group"]; index: number }) {
  if (row.group === "rentals") return 65_000 + (row.index % 5) * 15_000
  if (row.group === "motorcycles") return 1_600_000 + (row.index % 5) * 200_000
  if (row.group === "tuk_tuks") return 4_000_000 + (row.index % 5) * 400_000
  if (row.group === "trucks") return 28_000_000 + (row.index % 10) * 2_000_000
  return 12_000_000 + (row.index % 20) * 1_500_000
}

function car([makeId, model, en, ar, engineCc]: [
  string,
  string,
  string,
  string,
  number,
]): Configuration {
  return {
    makeId,
    modelId: `${makeId}-${model}`,
    en: `${makeId} ${en}`,
    ar,
    vehicleType: "car",
    firstYear: 2017,
    fuel: "petrol",
    transmission: "automatic",
    engineCc,
    payloadTons: null,
  }
}

function truck([makeId, model, en, ar]: [
  string,
  string,
  string,
  string,
]): Configuration {
  return {
    makeId,
    modelId: `${makeId}-${model}`,
    en: `${makeId} ${en}`,
    ar,
    vehicleType: "truck",
    firstYear: 2015,
    fuel: "diesel",
    transmission: "manual",
    engineCc: null,
    payloadTons: null,
  }
}

function motorcycle([makeId, model, en, ar]: [
  string,
  string,
  string,
  string,
]): Configuration {
  return {
    makeId,
    modelId: `${makeId}-${model}`,
    en: `${makeId} ${en}`,
    ar,
    vehicleType: "motorcycle",
    firstYear: 2018,
    fuel: "petrol",
    transmission: "manual",
    engineCc: 125,
    payloadTons: null,
  }
}
