import { BannerSlot } from "@/components/app/banner-slot"
import { searchPath } from "@/features/search/href"
import { useT } from "@/lib/i18n/use-t"
import type { Geo } from "@sayaratak/shared/schemas/fields"
import { homeQueries } from "../queries"
import { CategoryTiles } from "./category-tiles"
import { DealershipRow } from "./dealership-row"
import { HomeHero } from "./home-hero"
import { HomeEmpty } from "./home-empty"
import { HomeRail } from "./home-rail"
import { MakeGrid } from "./make-grid"
import { NearYouRail } from "./near-you-rail"
import { PostBand } from "./post-band"
import { ServicesBand } from "./services-band"

// The banner leads, the search card overlaps its lower edge (owner decision, see Deviations 6.1 hero), then the categories and the rails. A rail or band with nothing to show says how to fill it (owner, 2026-11-20).
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
    <div className="flex flex-col gap-12 pt-4 pb-12 md:gap-16 md:pt-6 md:pb-16">
      <HomeHero searchCity={searchCity} />
      <CategoryTiles />
      <MakeGrid />
      <HomeRail
        title={t("home.featured")}
        query={homeQueries.featured}
        href={searchPath({ featured: true })}
        empty={
          <HomeEmpty
            art="featured"
            title={t("home.empty_featured_title")}
            body={t("home.empty_featured_body")}
            href="/post"
            label={t("home.empty_post")}
          />
        }
      />
      <NearYouRail city={city} center={center} geo={geo} />
      <HomeRail
        title={t("home.newest")}
        query={homeQueries.newest}
        href={searchPath({ kind: "vehicle", sort: "newest" })}
        empty={
          <HomeEmpty
            art="newest"
            title={t("home.empty_newest_title")}
            body={t("home.empty_newest_body")}
            href="/post"
            label={t("home.empty_post")}
          />
        }
      />
      <HomeRail
        title={t("home.rentals")}
        query={homeQueries.rentals}
        href="/vehicles/cars/rent"
        empty={
          <HomeEmpty
            art="rentals"
            title={t("home.empty_rentals_title")}
            body={t("home.empty_rentals_body")}
            href="/post"
            label={t("home.empty_rentals_action")}
          />
        }
      />
      <DealershipRow />
      <ServicesBand />
      <BannerSlot
        placement="home_middle"
        ad="home_middle"
        fallback={
          <HomeEmpty
            art="ad-space"
            title={t("home.empty_ad_title")}
            body={t("home.empty_ad_body")}
            href="/contact"
            label={t("home.empty_ad_action")}
            level={2}
          />
        }
      />
      <PostBand />
    </div>
  )
}
