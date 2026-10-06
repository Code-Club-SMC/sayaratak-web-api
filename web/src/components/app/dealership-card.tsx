import { useT } from "@/lib/i18n/use-t"
import type { Dealership } from "@/schemas/profile"
import { OpenNowBadge } from "./open-now-badge"
import { ProviderCard } from "./provider-card"

export function DealershipCard({ dealership: d }: { dealership: Dealership }) {
  const { locale } = useT()
  return (
    <ProviderCard
      path={`/dealerships/${d.slug}`}
      image={d.logoUrl}
      name={d.name[locale]}
      verified={d.verified}
      rating={d.rating}
      cityId={d.cityId}
      summary={d.description[locale]}
      badge={<OpenNowBadge hours={d.hours} />}
    />
  )
}
