import { mediaSrc } from "@/lib/media"
import type { Dealership } from "@/schemas/profile"

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

// schema.org AutoDealer. `url` and `origin` are absolute; the rating is left out until there is a review.
export function dealershipJsonLd(
  d: Dealership,
  {
    name,
    description,
    city,
    url,
    origin,
  }: {
    name: string
    description: string
    city?: string
    url: string
    origin: string
  }
) {
  const image = [d.logoUrl, d.coverUrl]
    .filter(Boolean)
    .map((src) => mediaSrc(src, 1280))
    .map((src) => (src.startsWith("/") ? origin + src : src))
  return {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name,
    description,
    url,
    ...(image.length > 0 && { image }),
    ...(d.phones[0] && { telephone: d.phones[0] }),
    address: {
      "@type": "PostalAddress",
      streetAddress: d.address,
      ...(city && { addressLocality: city }),
      addressCountry: "SD",
    },
    ...(d.location && {
      geo: {
        "@type": "GeoCoordinates",
        latitude: d.location.lat,
        longitude: d.location.lng,
      },
    }),
    openingHoursSpecification: d.hours
      .filter((h) => !h.closed)
      .map((h) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: days[h.day],
        opens: h.open,
        closes: h.close,
      })),
    ...(d.rating.count > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: d.rating.avg,
        reviewCount: d.rating.count,
      },
    }),
  }
}
