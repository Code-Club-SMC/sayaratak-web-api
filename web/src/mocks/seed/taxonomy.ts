import type { VehicleType } from "@/schemas/listing"
import type { Taxonomy } from "@/schemas/taxonomy"
import type { Country } from "../types"
import { slugify } from "./util"

// City: id, English, Arabic, lat, lng, then districts as "English|Arabic".
const cityRows: [string, string, string, number, number, string[]][] = [
  [
    "khartoum",
    "Khartoum",
    "الخرطوم",
    15.5007,
    32.5599,
    [
      "Riyadh|الرياض",
      "Amarat|العمارات",
      "Burri|بري",
      "Manshiya|المنشية",
      "Jabra|جبرة",
      "Kafouri|كافوري",
    ],
  ],
  [
    "omdurman",
    "Omdurman",
    "أم درمان",
    15.6445,
    32.4777,
    [
      "Al Thawra|الثورة",
      "Mahdia|المهدية",
      "Wad Nubawi|ود نوباوي",
      "Mulazmin|الملازمين",
    ],
  ],
  [
    "bahri",
    "Khartoum North (Bahri)",
    "الخرطوم بحري",
    15.6333,
    32.5333,
    ["Shaabiya|الشعبية", "Halfaya|الحلفاية", "Kober|كوبر"],
  ],
  [
    "port-sudan",
    "Port Sudan",
    "بورتسودان",
    19.6158,
    37.2164,
    ["Deim Arab|ديم عرب", "Deim Madina|ديم مدينة", "Salbouna|سلبونا"],
  ],
  [
    "kassala",
    "Kassala",
    "كسلا",
    15.45,
    36.4,
    ["Khatmiya|الختمية", "Gash|القاش", "Central Market|السوق الكبير"],
  ],
  [
    "wad-madani",
    "Wad Madani",
    "ود مدني",
    14.4012,
    33.5199,
    ["Daraja|الدرجة", "Madina Arab|المدينة عرب", "Railway|السكة حديد"],
  ],
  [
    "el-obeid",
    "El Obeid",
    "الأبيض",
    13.1833,
    30.2167,
    ["Andalus|الأندلس", "Al Wehda|الوحدة", "Market|السوق"],
  ],
  [
    "nyala",
    "Nyala",
    "نيالا",
    12.0489,
    24.8807,
    ["Al Matar|المطار", "Al Jabal|الجبل", "Market|السوق"],
  ],
  [
    "gedaref",
    "Gedaref",
    "القضارف",
    14.0349,
    35.3838,
    ["Al Salam|السلام", "Market|السوق", "Al Matar|المطار"],
  ],
  [
    "atbara",
    "Atbara",
    "عطبرة",
    17.7022,
    33.9861,
    ["Dakhla|الداخلة", "Market|السوق", "Al Wehda|الوحدة"],
  ],
]

// Model: English|Arabic|type|min price (million SDG)|max price|engine cc (payload tons for trucks).
const makeRows: [string, string, string, string[]][] = [
  [
    "toyota",
    "Toyota",
    "تويوتا",
    [
      "Hilux|هايلكس|car|20|45|2400",
      "Corolla|كورولا|car|9|28|1600",
      "Camry|كامري|car|15|40|2400",
      "Land Cruiser|لاند كروزر|car|35|60|4000",
      "Prado|برادو|car|28|55|2700",
      "Hiace|هايس|car|18|38|2700",
      "Rav4|راف فور|car|18|42|2000",
      "Dyna|داينا|truck|25|55|3",
    ],
  ],
  [
    "hyundai",
    "Hyundai",
    "هيونداي",
    [
      "Elantra|النترا|car|10|30|1600",
      "Accent|أكسنت|car|9|22|1400",
      "Tucson|توسان|car|18|42|2000",
      "Sonata|سوناتا|car|14|36|2400",
      "HD65|إتش دي 65|truck|30|65|3",
    ],
  ],
  [
    "kia",
    "Kia",
    "كيا",
    [
      "Picanto|بيكانتو|car|9|18|1000",
      "Cerato|سيراتو|car|11|28|1600",
      "Sportage|سبورتاج|car|18|40|2000",
    ],
  ],
  [
    "nissan",
    "Nissan",
    "نيسان",
    [
      "Sunny|صني|car|9|20|1500",
      "Patrol|باترول|car|30|60|4800",
      "Pickup|بيك أب|car|14|30|2400",
    ],
  ],
  [
    "mitsubishi",
    "Mitsubishi",
    "ميتسوبيشي",
    [
      "Lancer|لانسر|car|9|22|1600",
      "L200|إل 200|car|20|42|2500",
      "Pajero|باجيرو|car|22|50|3500",
      "Canter|كانتر|truck|30|70|4",
    ],
  ],
  [
    "suzuki",
    "Suzuki",
    "سوزوكي",
    [
      "Swift|سويفت|car|9|20|1300",
      "Alto|ألتو|car|9|14|800",
      "Carry|كاري|truck|25|40|1",
    ],
  ],
  [
    "honda",
    "Honda",
    "هوندا",
    [
      "Civic|سيفيك|car|11|32|1800",
      "Accord|أكورد|car|14|38|2400",
      "CG125|سي جي 125|motorcycle|1.5|3|125",
    ],
  ],
  [
    "chevrolet",
    "Chevrolet",
    "شيفروليه",
    [
      "Optra|أوبترا|car|9|16|1600",
      "Cruze|كروز|car|11|24|1800",
      "Spark|سبارك|car|9|14|1000",
    ],
  ],
  [
    "peugeot",
    "Peugeot",
    "بيجو",
    [
      "206|206|car|9|14|1400",
      "301|301|car|10|20|1600",
      "508|508|car|16|34|1600",
    ],
  ],
  [
    "mercedes",
    "Mercedes-Benz",
    "مرسيدس بنز",
    [
      "Actros|أكتروس|truck|80|120|20",
      "C200|سي 200|car|20|50|2000",
      "E250|إي 250|car|28|60|2000",
      "Sprinter|سبرنتر|car|25|55|2200",
    ],
  ],
  [
    "isuzu",
    "Isuzu",
    "إيسوزو",
    [
      "NPR|إن بي آر|truck|35|75|4",
      "FVR|إف في آر|truck|70|115|10",
      "D-Max|دي ماكس|car|20|45|2500",
    ],
  ],
  [
    "bajaj",
    "Bajaj",
    "باجاج",
    [
      "RE|آر إي|tuk_tuk|4|7|200",
      "Qute|كيوت|rickshaw|5|9|216",
      "Boxer|بوكسر|motorcycle|1.5|2.8|150",
    ],
  ],
  [
    "tvs",
    "TVS",
    "تي في إس",
    [
      "King|كينج|tuk_tuk|4|8|200",
      "HLX 125|إتش إل إكس 125|motorcycle|1.5|2.6|125",
    ],
  ],
  [
    "yamaha",
    "Yamaha",
    "ياماها",
    [
      "YBR125|واي بي آر 125|motorcycle|2|4|125",
      "FZ|إف زد|motorcycle|3|6|150",
      "Crux|كروكس|motorcycle|1.5|2.5|110",
    ],
  ],
  [
    "haojue",
    "Haojue",
    "هاوجو",
    [
      "HJ125|إتش جي 125|motorcycle|1.5|2.6|125",
      "HJ150|إتش جي 150|motorcycle|2|3.5|150",
    ],
  ],
  [
    "dayun",
    "Dayun",
    "داييون",
    [
      "DY125|دي واي 125|motorcycle|1.5|2.5|125",
      "DY150|دي واي 150|motorcycle|1.8|3|150",
      "DY200 Cargo|دي واي 200 كارجو|rickshaw|4|7|200",
    ],
  ],
]

export type CatalogModel = {
  id: string
  makeId: string
  type: VehicleType
  min: number
  max: number
  size: number
  ar: string
  en: string
}
const vehicleTypes: [VehicleType, string, string][] = [
  ["car", "Cars", "سيارات"],
  ["truck", "Trucks", "شاحنات"],
  ["motorcycle", "Motorcycles", "دراجات نارية"],
  ["tuk_tuk", "Tuk-tuks", "توك توك"],
  ["rickshaw", "Rickshaws", "ركشات"],
]
// Parts: category, then "Arabic|English|min|max" items (SDG).
export const partCatalog: {
  id: string
  en: string
  ar: string
  items: [string, string, number, number][]
}[] = [
  {
    id: "engine",
    en: "Engine",
    ar: "محرك",
    items: [
      ["طقم بساتم", "Piston set", 250000, 900000],
      ["مضخة مياه", "Water pump", 40000, 150000],
    ],
  },
  {
    id: "brakes",
    en: "Brakes",
    ar: "فرامل",
    items: [
      ["أقمشة فرامل", "Brake pads", 20000, 90000],
      ["اسطوانات فرامل", "Brake discs", 60000, 250000],
    ],
  },
  {
    id: "tires",
    en: "Tires and wheels",
    ar: "إطارات وجنوط",
    items: [
      ["إطار جديد", "New tire", 80000, 350000],
      ["جنط ألمنيوم", "Alloy wheel", 120000, 500000],
    ],
  },
  {
    id: "batteries",
    en: "Batteries",
    ar: "بطاريات",
    items: [
      ["بطارية 70 أمبير", "70Ah battery", 90000, 220000],
      ["بطارية 100 أمبير", "100Ah battery", 140000, 300000],
    ],
  },
  {
    id: "filters-oils",
    en: "Filters and oils",
    ar: "فلاتر وزيوت",
    items: [
      ["طقم فلاتر", "Filter kit", 15000, 60000],
      ["زيت محرك 5 لتر", "Engine oil 5L", 30000, 90000],
    ],
  },
  {
    id: "suspension",
    en: "Suspension",
    ar: "تعليق",
    items: [
      ["مساعدين أمامية", "Front shock absorbers", 100000, 400000],
      ["ذراع تعليق", "Control arm", 50000, 200000],
    ],
  },
  {
    id: "electrical",
    en: "Electrical",
    ar: "كهرباء",
    items: [
      ["دينمو", "Alternator", 150000, 500000],
      ["سلف", "Starter motor", 120000, 400000],
    ],
  },
  {
    id: "body-lights",
    en: "Body and lights",
    ar: "هيكل وإضاءة",
    items: [
      ["كشاف أمامي", "Headlight", 80000, 350000],
      ["صدام أمامي", "Front bumper", 120000, 450000],
    ],
  },
  {
    id: "accessories",
    en: "Accessories",
    ar: "إكسسوارات",
    items: [
      ["طقم كفرات مقاعد", "Seat covers", 40000, 150000],
      ["شاشة أندرويد", "Android screen", 150000, 450000],
    ],
  },
  {
    id: "transmission",
    en: "Transmission",
    ar: "ناقل حركة",
    items: [
      ["قير أوتوماتيك مستعمل", "Used automatic gearbox", 600000, 1800000],
      ["طقم كلتش", "Clutch kit", 80000, 300000],
    ],
  },
]
const specializations: [string, string, string][] = [
  ["engine", "Engines", "المحركات"],
  ["electrical", "Electrical", "الكهرباء"],
  ["ac", "Air conditioning", "التكييف"],
  ["transmission", "Transmission", "ناقل الحركة"],
  ["brakes-suspension", "Brakes and suspension", "الفرامل والتعليق"],
  ["body-paint", "Body and paint", "السمكرة والدهان"],
  ["diagnostics", "Computer diagnostics", "الفحص بالكمبيوتر"],
  ["motorcycles", "Motorcycles and tuk-tuks", "الدراجات والتوك توك"],
]
export const serviceTemplateRows: [string, string, string][] = [
  ["oil-change", "Oil change", "تغيير زيت"],
  ["brakes", "Brakes", "الفرامل"],
  ["engine-diagnostics", "Engine diagnostics", "فحص المحرك"],
  ["air-conditioning", "Air conditioning", "التكييف"],
  ["electrical", "Electrical", "الكهرباء"],
  ["tires-alignment", "Tires and alignment", "الإطارات والميزان"],
  ["body-paint", "Body and paint", "السمكرة والدهان"],
  ["transmission", "Transmission", "ناقل الحركة"],
  ["suspension", "Suspension", "التعليق"],
]
const bi = (en: string, ar: string) => ({ en, ar })

export const countries: Country[] = [
  { id: "sd", name: bi("Sudan", "السودان"), dialCode: "+249" },
  { id: "eg", name: bi("Egypt", "مصر"), dialCode: "+20" },
  { id: "sa", name: bi("Saudi Arabia", "السعودية"), dialCode: "+966" },
  { id: "ae", name: bi("United Arab Emirates", "الإمارات"), dialCode: "+971" },
  { id: "ss", name: bi("South Sudan", "جنوب السودان"), dialCode: "+211" },
]

export function seedTaxonomy() {
  const catalog: CatalogModel[] = []
  const taxonomy: Taxonomy = {
    cities: cityRows.map(([id, en, ar, lat, lng]) => ({
      id,
      slug: id,
      name: bi(en, ar),
      center: { lat, lng },
    })),
    districts: cityRows.flatMap(([cityId, , , , , rows]) =>
      rows.map((row) => {
        const [en = "", ar = ""] = row.split("|")
        return { id: `${cityId}-${slugify(en)}`, cityId, name: bi(en, ar) }
      })
    ),
    makes: [],
    models: [],
    vehicleTypes: vehicleTypes.map(([id, en, ar]) => ({
      id,
      name: bi(en, ar),
      enabled: true,
    })),
    partCategories: partCatalog.map((c) => ({
      id: c.id,
      slug: c.id,
      name: bi(c.en, c.ar),
    })),
    specializations: specializations.map(([id, en, ar]) => ({
      id,
      name: bi(en, ar),
    })),
    serviceTemplates: serviceTemplateRows.map(([id, en, ar]) => ({
      id,
      name: bi(en, ar),
    })),
  }
  for (const [makeId, makeEn, makeAr, models] of makeRows) {
    const types = new Set<VehicleType>()
    for (const row of models) {
      const [en = "", ar = "", type = "car", min = "0", max = "0", size = "0"] =
        row.split("|")
      const id = `${makeId}-${slugify(en)}`
      const vehicleType = vehicleTypes.find(([t]) => t === type)?.[0] ?? "car"
      types.add(vehicleType)
      catalog.push({
        id,
        makeId,
        type: vehicleType,
        min: Number(min),
        max: Number(max),
        size: Number(size),
        ar,
        en,
      })
      taxonomy.models.push({ id, makeId, name: bi(en, ar) })
    }
    taxonomy.makes.push({
      id: makeId,
      slug: makeId,
      name: bi(makeEn, makeAr),
      vehicleTypes: [...types],
    })
  }
  return { taxonomy, catalog }
}
