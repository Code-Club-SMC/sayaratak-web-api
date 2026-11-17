import { BannerSlot } from "@/components/app/banner-slot"
import { HeroFallback } from "./hero-fallback"
import { HeroSearch } from "./hero-search"
import { QuickLinks } from "./quick-links"

// The banner carousel leads and the search card sits under it (owner decision, 2026-11-17: no overlap, so the carousel controls and text stay clear). With no banner the brand panel takes the carousel's place.
export function HomeHero({ searchCity }: { searchCity: string }) {
  return (
    <section className="flex flex-col gap-3">
      <BannerSlot
        placement="home_top"
        ad="home_top"
        variant="hero"
        fallback={<HeroFallback />}
      />
      <HeroSearch city={searchCity} />
      <QuickLinks />
    </section>
  )
}
