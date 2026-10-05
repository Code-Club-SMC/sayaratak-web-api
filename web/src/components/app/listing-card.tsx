import { useCityName } from "@/hooks/use-city-name"
import { formatMileage } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { cardSizes } from "@/lib/media"
import { localeHref } from "@/lib/navigation"
import { useNow } from "@/lib/now"
import { promotionKind } from "@/lib/promotion"
import { cn } from "@/lib/utils"
import type { Listing } from "@/schemas/listing"
import { FavoriteButton } from "./favorite-button"
import { MediaImage } from "./media-image"
import { PriceText } from "./price-text"
import { PromotedBadge } from "./promoted-badge"
import { RelativeTime } from "./relative-time"
import { StatusBadge } from "./status-badge"
import { VerifiedBadge } from "./verified-badge"

// "grid" is the card in rails and result grids, "row" is the mobile result list.
// The title link is stretched over the whole card, so the heart stays a separate button.
export function ListingCard({
  listing,
  variant = "grid",
}: {
  listing: Listing
  variant?: "grid" | "row"
}) {
  const { t, locale } = useT()
  const now = useNow()
  const city = useCityName(listing.cityId)
  const promoted = promotionKind(listing.promotions, now)
  const first = listing.media[0]
  const facts =
    listing.kind === "part"
      ? [t(`condition.${listing.condition}`)]
      : [
          listing.year?.toString(),
          listing.mileageKm == null
            ? null
            : formatMileage(listing.mileageKm, locale),
          listing.fuel && t(`fuel.${listing.fuel}`),
        ].filter(Boolean)
  const row = variant === "row"
  return (
    <article
      className={cn(
        "group relative flex rounded-xl bg-card p-2",
        row ? "gap-3" : "flex-col gap-2"
      )}
    >
      <div className={cn("relative", row && "w-30 shrink-0")}>
        <MediaImage
          src={first?.type === "video" ? first.posterUrl : (first?.url ?? null)}
          alt=""
          placeholderColor={first?.placeholderColor}
          sizes={row ? "120px" : cardSizes}
          className={row ? "aspect-square" : undefined}
        />
        <div className="absolute start-2 end-12 top-2 flex flex-wrap gap-1">
          {promoted && <PromotedBadge kind={promoted} />}
          {listing.owner.verified && (
            <span className="rounded-full bg-card">
              <VerifiedBadge />
            </span>
          )}
          {listing.status !== "available" && (
            <span className="rounded-full bg-card">
              <StatusBadge status={listing.status} />
            </span>
          )}
        </div>
        <FavoriteButton
          listingId={listing.id}
          className="absolute end-1 top-1 z-10"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 px-1 pb-1">
        <PriceText price={listing.price} period={listing.rentPeriod} />
        <h3 className="min-h-[2lh] text-ui font-medium">
          <a
            href={localeHref(`/listing/${listing.slug}`, locale)}
            className="line-clamp-2 group-hover:underline after:absolute after:inset-0"
          >
            <bdi>{listing.title}</bdi>
          </a>
        </h3>
        <p className="flex flex-wrap gap-x-3 text-caption text-muted-foreground">
          {facts.map((fact) => (
            <span key={fact} className="num">
              {fact}
            </span>
          ))}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-caption text-muted-foreground">
          <span className="truncate">{city}</span>
          <RelativeTime iso={listing.createdAt} className="shrink-0" />
        </div>
      </div>
    </article>
  )
}
