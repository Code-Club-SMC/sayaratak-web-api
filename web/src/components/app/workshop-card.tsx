import type { Workshop } from "@/schemas/profile"
import { OpenNowBadge } from "./open-now-badge"
import { ProviderCard } from "./provider-card"

export function WorkshopCard({ workshop: w }: { workshop: Workshop }) {
  return (
    <ProviderCard
      path={`/workshops/${w.slug}`}
      image={w.logoUrl}
      name={w.name}
      verified={w.verified}
      rating={w.rating}
      cityId={w.cityId}
      summary={w.description}
      badge={<OpenNowBadge hours={w.hours} />}
    />
  )
}
