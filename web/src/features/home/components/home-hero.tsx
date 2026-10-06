import { BannerSlot } from "@/components/app/banner-slot"
import { HeroSearch } from "./hero-search"
import { QuickLinks } from "./quick-links"

// The tall banner leads; the compact search card is lifted over its lower edge, about a third of its height (it floats over the banner, so only then it gets the shadow). With no banner the card stands by itself and nothing is lifted.
export function HomeHero({ searchCity }: { searchCity: string }) {
  return (
    <section className="flex flex-col gap-3">
      <BannerSlot placement="home_top" variant="hero" />
      <div className="relative z-10 [aside+&]:mx-2 [aside+&]:-mt-8 [aside+&]:rounded-2xl [aside+&]:shadow-floating md:[aside+&]:mx-8 md:[aside+&]:-mt-12">
        <HeroSearch city={searchCity} />
      </div>
      <QuickLinks />
    </section>
  )
}
