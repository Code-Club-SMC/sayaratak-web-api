import { BannerSlot } from "@/components/app/banner-slot"
import { searchPath } from "@/features/search/href"
import { useT } from "@/lib/i18n/use-t"
import type { Geo } from "@/schemas/fields"
import { homeQueries } from "../queries"
import { CategoryTiles } from "./category-tiles"
import { DealershipRow } from "./dealership-row"
import { HeroSearch } from "./hero-search"
import { HomeRail } from "./home-rail"
import { NearYouRail } from "./near-you-rail"
import { PostBand } from "./post-band"
import { QuickLinks } from "./quick-links"
import { ServicesBand } from "./services-band"

// Search first (A4), then the banner, the categories and the rails. A rail or band with nothing to show leaves the page.
export function HomePage({
  searchCity,
  city,
  center,
  geo,
}: {
  searchCity: string
  city: string
  center: Geo
  geo: Geo | null
}) {
  const { t } = useT()
  return (
    <div className="flex flex-col gap-12 py-12">
      <section className="flex flex-col gap-3">
        <h1 className="mb-1 text-page font-semibold md:text-hero">
          {t("home.title")}
        </h1>
        <HeroSearch city={searchCity} />
        <QuickLinks />
      </section>
      <BannerSlot placement="home_top" />
      <CategoryTiles />
      <HomeRail
        title={t("home.featured")}
        query={homeQueries.featured}
        href={searchPath({ featured: true })}
        eager={4}
      />
      <NearYouRail city={city} center={center} geo={geo} />
      <HomeRail
        title={t("home.newest")}
        query={homeQueries.newest}
        href={searchPath({ kind: "vehicle", sort: "newest" })}
      />
      <HomeRail
        title={t("home.rentals")}
        query={homeQueries.rentals}
        href="/vehicles/cars/rent"
      />
      <DealershipRow />
      <ServicesBand />
      <BannerSlot placement="home_middle" />
      <PostBand />
    </div>
  )
}
