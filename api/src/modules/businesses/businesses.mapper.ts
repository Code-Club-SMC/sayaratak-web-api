import type { Bilingual } from "@sayaratak/shared/schemas/fields"
import type { MapPoint } from "@sayaratak/shared/schemas/responses"

type Pinned = {
  id: string
  slug: string
  name: Bilingual
  location: { lat: number; lng: number }
  seedDatasetId: string | null
}

/** A business as a map point; `rating` is null until it has a shown review. */
export function toMapPoint(
  business: Pinned & {
    kind: "dealership" | "workshop" | "mechanic"
    rating: number | undefined
    photoUrl: string | undefined
  }
): MapPoint {
  return {
    interactionMode: business.seedDatasetId ? "preview" : "live",
    id: business.id,
    kind: business.kind,
    title: business.name,
    slug: business.slug,
    location: business.location,
    price: null,
    rating: business.rating ?? null,
    photoUrl: business.photoUrl ?? null,
  }
}
