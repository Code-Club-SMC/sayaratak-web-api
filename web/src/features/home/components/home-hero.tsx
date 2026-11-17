import { BannerSlot } from "@/components/app/banner-slot"
import { HeroFallback } from "./hero-fallback"
import { HeroSearch } from "./hero-search"
import { QuickLinks } from "./quick-links"

// The banner carousel leads; the compact search card is lifted over its lower edge, about a third of its height (it floats over the banner, so only then it gets the shadow). With no banner the brand panel takes the carousel's place, so the card always has something to lift over.
export function HomeHero({ searchCity }: { searchCity: string }) {
  return (
    <section className="-mt-4 flex flex-col gap-3 md:-mt-6">
      <BannerSlot
        placement="home_top"
        ad="home_top"
        variant="hero"
        fallback={<HeroFallback />}
      />
      <div className="relative z-10 [section+&]:mx-2 [section+&]:-mt-8 [section+&]:rounded-xl [section+&]:shadow-floating md:[section+&]:mx-8 md:[section+&]:-mt-12">
        <HeroSearch city={searchCity} />
      </div>
      <QuickLinks />
    </section>
  )
}
