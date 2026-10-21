import type {
  Banner,
  Backup,
  Report,
  Settings,
  SitePage,
  VerificationRequest,
} from "@/schemas/admin"
import type { AdPage, Campaign } from "@/schemas/ads"
import type { Broadcast, EventType, NotificationPrefs } from "@/schemas/api"
import type { Bilingual, Locale } from "@/schemas/fields"
import type { contactSubjects } from "@/schemas/inputs"
import type { Listing, Media } from "@/schemas/listing"
import type { Message, Notification } from "@/schemas/messaging"
import type {
  Payment,
  Plan,
  Promotion,
  PromotionPrice,
  Subscription,
} from "@/schemas/billing"
import type { Dealership, Mechanic, Workshop } from "@/schemas/profile"
import type { Review } from "@/schemas/review"
import type { SavedSearch } from "@/schemas/saved-search"
import type { Taxonomy } from "@/schemas/taxonomy"
import type { User } from "@/schemas/user"

// Rows are the API shapes plus the few server-only columns; handlers parse through the schemas, which drops the extras.
export type UserRow = Omit<User, "hasPassword"> & {
  password: string | null
  locale: Locale
  prefs: NotificationPrefs
}
export type ListingRow = Listing & { ownerUserId: string }
export type ThreadRow = {
  id: string
  subjectType: "listing" | "dealership" | "workshop" | "mechanic"
  subjectId: string
  subjectTitle: Bilingual
  subjectImage?: string
  participantIds: string[]
}
export type NotificationRow = Notification & { userId: string }
export type SavedSearchRow = SavedSearch & { userId: string }
export type FavoriteRow = {
  id: string
  userId: string
  listingId: string
  createdAt: string
}
export type DraftRow = {
  id: string
  userId: string
  key: string
  data: Record<string, unknown>
}
export type EventRow = {
  id: string
  day: string
  targetId: string
  counts: Record<EventType, number>
}
export type ContactRow = {
  id: string
  name: string
  contact: string
  subject: (typeof contactSubjects)[number]
  message: string
  createdAt: string
}
export type BroadcastRow = Broadcast
export type UploadRow = {
  id: string
  name: string
  type: string
  bytes: ArrayBuffer
  // Set by POST /uploads, so a later save by id (PUT /me/business/images) can build the Media.
  media?: Media
}
// `id` is the lowercase ISO code; it never changes once the country exists. Only enabled countries reach the public site.
export type Country = {
  id: string
  name: Bilingual
  dialCode: string
  enabled: boolean
}
export type PromotionPriceRow = PromotionPrice & { id: string }
export type SitePageRow = SitePage & { id: string }

export type Db = {
  taxonomy: Taxonomy
  countries: Country[]
  users: UserRow[]
  listings: ListingRow[]
  dealerships: Dealership[]
  workshops: Workshop[]
  mechanics: Mechanic[]
  reviews: Review[]
  favorites: FavoriteRow[]
  savedSearches: SavedSearchRow[]
  threads: ThreadRow[]
  messages: Message[]
  notifications: NotificationRow[]
  plans: Plan[]
  subscriptions: Subscription[]
  payments: Payment[]
  promotions: Promotion[]
  promotionPrices: PromotionPriceRow[]
  reports: Report[]
  verifications: VerificationRequest[]
  banners: Banner[]
  adPages: AdPageRow[]
  campaigns: CampaignRow[]
  pages: SitePageRow[]
  backups: Backup[]
  settings: Settings
  drafts: DraftRow[]
  events: EventRow[]
  contacts: ContactRow[]
  broadcasts: BroadcastRow[]
  uploads: Map<string, UploadRow>
  attempts: Map<string, number[]>
  // Email codes by `signup:<email>` or `reset:<email>`. A sign-up code carries the account to create once it is verified.
  codes: Map<string, EmailCode>
  // One-time reset tokens (a verified reset code), token to user id.
  resetTokens: Map<string, string>
}

export type EmailCode = {
  code: string
  expiresAt: number
  fails: number
  signup?: { fullName: string; password: string }
}

// Admin-set price and slot count of a page that sells banners; `free` is computed per request.
export type AdPageRow = Omit<AdPage, "free">
// `ownerName` is computed from the owner on the way out.
export type CampaignRow = Omit<Campaign, "ownerName">
