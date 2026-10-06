import { BannerSlot } from "@/components/app/banner-slot"
import { HeroSearch } from "./hero-search"
import { QuickLinks } from "./quick-links"

// The tall banner, then the search card lifted over its lower edge (the card floats over it, so only then it gets the shadow). With no banner the card stands by itself and nothing is lifted.
export function HomeHero({ searchCity }: { searchCity: string }) {
  return (
    <section className="flex flex-col gap-2">
      <BannerSlot placement="home_top" variant="hero" />
      <div className="relative z-10 [aside+&]:mx-2 [aside+&]:-mt-6 [aside+&]:rounded-2xl [aside+&]:shadow-floating md:[aside+&]:mx-8 md:[aside+&]:-mt-16">
        <HeroSearch city={searchCity} />
      </div>
      <QuickLinks />
    </section>
  )
}
