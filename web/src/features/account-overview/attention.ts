import { canRenew } from "@/features/listings-manager/use-listing-actions"
import type { Listing } from "@/schemas/listing"

const DAY_MS = 24 * 60 * 60 * 1000
export const RESERVED_DAYS = 14

export type Attention = "rejected" | "expiring" | "reserved"

// Same rules as the mock's `needsAttention` filter, one reason per listing: the first that holds.
export const attentionOf = (l: Listing, now: number): Attention | undefined => {
  if (l.moderation === "rejected") return "rejected"
  if (canRenew(l, now)) return "expiring"
  if (
    l.moderation === "approved" &&
    l.status === "reserved" &&
    now - Date.parse(l.updatedAt) >= RESERVED_DAYS * DAY_MS
  )
    return "reserved"
}

export const daysSince = (iso: string, now: number) =>
  Math.floor((now - Date.parse(iso)) / DAY_MS)
