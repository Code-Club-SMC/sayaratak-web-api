import { useId } from "react"

import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import type { Listing } from "@/schemas/listing"
import { ListingCard } from "./listing-card"

// Sideways scroll-snap row on mobile, four columns from lg. `href` is a path without the locale.
export function ListingRail({
  title,
  href,
  listings,
}: {
  title: string
  href?: string
  listings: Listing[]
}) {
  const { t, locale } = useT()
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={id} className="text-title font-semibold">
          {title}
        </h2>
        {href && (
          <a
            href={localeHref(href, locale)}
            className="shrink-0 text-ui font-medium text-primary hover:underline"
          >
            {t("common.see_all")}
          </a>
        )}
      </div>
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
        {listings.map((listing) => (
          <li key={listing.id} className="w-60 shrink-0 snap-start lg:w-auto">
            <ListingCard listing={listing} />
          </li>
        ))}
      </ul>
    </section>
  )
}
