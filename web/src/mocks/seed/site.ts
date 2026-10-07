import type {
  Backup,
  Banner,
  Report,
  Settings,
  VerificationRequest,
} from "@/schemas/admin"
import type { EventType } from "@/schemas/api"
import type { EventRow, ListingRow, SitePageRow, UserRow } from "../types"
import { DAY, HOUR, ago, ahead, chance, int } from "./util"

export const settings: Settings = {
  autoApproveVerifiedDealers: true,
  listingExpiryDays: 30,
  individualSubscriptionsEnabled: true,
  freeListingLimit: 3,
  bankakAccount: { name: "Sayaratak", number: "1234567" },
  contact: {
    phone: "+249123456789",
    whatsapp: "+249912000000",
    email: "hello@sayaratak.sd",
    address: "الخرطوم، السودان",
  },
  locales: ["ar", "en"],
}

const page = (
  slug: SitePageRow["slug"],
  ar: string,
  en: string,
  bodyAr: string,
  bodyEn: string
): SitePageRow => ({
  id: slug,
  slug,
  title: { ar, en },
  body: { ar: bodyAr, en: bodyEn },
  updatedAt: ago(30 * DAY),
})
export const pages = (): SitePageRow[] => [
  page(
    "about",
    "من نحن",
    "About us",
    "سيارتك سوق للسيارات وخدماتها في السودان. نجمع البائعين والمشترين والورش والميكانيكيين في مكان واحد.",
    "Sayaratak is a marketplace for vehicles and auto services in Sudan. It brings sellers, buyers, workshops and mechanics together."
  ),
  page(
    "contact",
    "اتصل بنا",
    "Contact us",
    "يسعدنا سماع رأيك. راسلنا في أي وقت.",
    "We would like to hear from you. Write to us any time."
  ),
  page(
    "privacy",
    "سياسة الخصوصية",
    "Privacy policy",
    "نحتفظ ببياناتك لتشغيل الخدمة فقط ولا نبيعها لأي جهة.",
    "We keep your data only to run the service and never sell it."
  ),
  page(
    "terms",
    "الشروط والأحكام",
    "Terms",
    "باستخدامك الموقع فأنت توافق على نشر معلومات صحيحة والالتزام بقواعد المجتمع.",
    "By using the site you agree to post accurate information and follow the community rules."
  ),
]

export const backups = (): Backup[] =>
  Array.from({ length: 5 }, (_, i) => ({
    id: `bk-${i + 1}`,
    createdAt: ago((i + 1) * DAY),
    sizeMb: 40 + i * 3,
    type: i % 2 ? "manual" : "auto",
    status: "ready",
  }))

// One photo per banner (`public/mock/banner-N.webp`, made by `bun run banners`) with real text in both languages on top. The trucks banner stands in for a paid one, so it carries the "Ad" chip.
const text = (eyebrow: string, heading: string, body: string, cta: string) => ({
  eyebrow,
  heading,
  body,
  cta,
})
const bannerRows = [
  {
    title: "عروض الصيف",
    href: "/search?type=car",
    focus: 50,
    copy: {
      en: text(
        "Cars",
        "Summer offers on cars",
        "Browse verified listings across Sudan",
        "Browse cars"
      ),
      ar: text(
        "سيارات",
        "عروض الصيف على السيارات",
        "تصفح إعلانات موثقة في كل أنحاء السودان",
        "تصفح السيارات"
      ),
    },
  },
  {
    title: "اشحن سيارتك",
    href: "/search?type=truck",
    focus: 54,
    sponsored: true,
    copy: {
      en: text(
        "Trucks",
        "Move more with the right truck",
        "Trucks and pickups from dealers near you",
        "See trucks"
      ),
      ar: text(
        "شاحنات",
        "انقل أكثر بالشاحنة المناسبة",
        "شاحنات وبيك أب من معارض قريبة منك",
        "عرض الشاحنات"
      ),
    },
  },
  {
    title: "ابحث بسهولة",
    href: "/search?kind=part",
    focus: 33,
    copy: {
      en: text(
        "Parts",
        "Find the part, fast",
        "Brakes, filters, spark plugs and more",
        "Browse parts"
      ),
      ar: text(
        "قطع غيار",
        "اعثر على القطعة بسرعة",
        "فرامل وفلاتر وشمعات وأكثر",
        "تصفح القطع"
      ),
    },
  },
  {
    title: "سجّل نشاطك",
    href: "/onboarding",
    focus: 4,
    copy: {
      en: text(
        "For businesses",
        "List your dealership, workshop or garage",
        "Reach buyers across Sudan. Set up in minutes.",
        "Get started"
      ),
      ar: text(
        "للأعمال",
        "سجّل معرضك أو ورشتك مجانًا",
        "اوصل إلى مشترين في كل أنحاء السودان. التسجيل في دقائق.",
        "ابدأ الآن"
      ),
    },
  },
]
export const banners = (): Banner[] =>
  (["home_top", "home_middle", "search_top", "directory_top"] as const).map(
    (placement, i) => ({
      id: `bn-${i + 1}`,
      title: bannerRows[i]?.title ?? "",
      imageUrl: {
        ar: `/mock/banner-${i + 1}.webp`,
        en: `/mock/banner-${i + 1}.webp`,
      },
      copy: bannerRows[i]?.copy,
      sponsored: bannerRows[i]?.sponsored ?? false,
      focus: bannerRows[i]?.focus ?? 50,
      href: bannerRows[i]?.href ?? "/search",
      placement,
      startsAt: ago(10 * DAY),
      endsAt: ahead(60 * DAY),
      active: true,
      sortOrder: i,
      impressions: int(1000, 9000),
      clicks: int(40, 400),
    })
  )

export function seedReports(
  listings: ListingRow[],
  users: UserRow[]
): Report[] {
  const approved = listings.filter((l) => l.moderation === "approved")
  const reporters = users.filter((u) => u.role === "user")
  const reasons: Report["reason"][] = [
    "scam",
    "wrong_category",
    "already_sold",
    "duplicate",
    "inappropriate",
    "other",
  ]
  return reasons.map((reason, i) => ({
    id: `rp-${i + 1}`,
    listingId: approved[i * 7]?.id ?? "",
    reporterId: reporters[i + 1]?.id ?? "u-1",
    reason,
    details: i % 2 ? "الإعلان مكرر أكثر من مرة" : undefined,
    status: i < 4 ? "open" : i === 4 ? "dismissed" : "actioned",
    createdAt: ago((i + 1) * 5 * HOUR),
    resolutionNote: i >= 4 ? "تمت المراجعة" : undefined,
  }))
}

export function seedVerifications(
  targets: {
    id: string
    ownerId: string
    type: VerificationRequest["targetType"]
  }[]
): VerificationRequest[] {
  return targets.slice(0, 6).map((t, i) => ({
    id: `vr-${i + 1}`,
    targetType: t.type,
    targetId: t.id,
    ownerId: t.ownerId,
    documents: [
      {
        id: `doc-${i + 1}-1`,
        label: "السجل التجاري",
        url: `/mock/doc-0${(i % 3) + 1}.webp`,
      },
    ],
    note: i % 2 ? "نرجو المراجعة" : undefined,
    status: i < 4 ? "pending" : i === 4 ? "approved" : "rejected",
    rejectionReason: i === 5 ? "المستند غير واضح" : undefined,
    createdAt: ago((i + 1) * 9 * HOUR),
  }))
}

// Daily counts for ninety days so every analytics chart has a real series.
export function seedEvents(targetIds: string[]): EventRow[] {
  const rows: EventRow[] = []
  const zero = (): Record<EventType, number> => ({
    view: 0,
    phone_click: 0,
    whatsapp_click: 0,
    share: 0,
    banner_click: 0,
    banner_view: 0,
  })
  for (const targetId of targetIds) {
    const base = int(2, 20)
    for (let d = 0; d < 90; d++) {
      const day = new Date(Date.now() - d * DAY).toISOString().slice(0, 10)
      const views = Math.max(
        0,
        base + int(-3, 8) + (chance(0.1) ? int(10, 30) : 0)
      )
      rows.push({
        id: `ev-${targetId}-${day}`,
        day,
        targetId,
        counts: {
          ...zero(),
          view: views,
          phone_click: Math.round(views * 0.12),
          whatsapp_click: Math.round(views * 0.1),
          share: Math.round(views * 0.03),
        },
      })
    }
  }
  return rows
}
