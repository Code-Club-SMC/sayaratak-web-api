import type { Listing } from "@/schemas/listing"

// A paid listing shows one badge: Sponsored for the sponsored promotion, Featured for pin, boost or homepage.
export function promotionKind(promotions: Listing["promotions"], now: number) {
  const live = promotions.filter(
    (p) => Date.parse(p.startsAt) <= now && now < Date.parse(p.endsAt)
  )
  if (live.some((p) => p.type === "sponsored")) return "sponsored"
  return live.length > 0 ? "featured" : null
}
