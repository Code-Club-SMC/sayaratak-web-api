import type { Dealership } from "@/schemas/profile"
import { OpenNowBadge } from "./open-now-badge"
import { ProviderCard } from "./provider-card"

export function DealershipCard({ dealership: d }: { dealership: Dealership }) {
  return (
    <ProviderCard
      path={`/dealerships/${d.slug}`}
      image={d.logoUrl}
      name={d.name}
      verified={d.verified}
      rating={d.rating}
      cityId={d.cityId}
      summary={d.description}
      badge={<OpenNowBadge hours={d.hours} />}
    />
  )
}
