import { usePrefs } from "@/lib/prefs"
import type { Listing } from "@/schemas/listing"
import { ListingCard } from "./listing-card"

// The view comes from the saved preference unless the page passes one.
export function ListingGrid({
  listings,
  view,
}: {
  listings: Listing[]
  view?: "grid" | "row"
}) {
  const { listingView } = usePrefs()
  const row = (view ?? listingView) === "row"
  return (
    <ul
      className={
        row
          ? "grid grid-cols-1 gap-3 md:grid-cols-2"
          : "grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4"
      }
    >
      {listings.map((listing) => (
        <li key={listing.id} className="*:h-full">
          <ListingCard listing={listing} variant={row ? "row" : "grid"} />
        </li>
      ))}
    </ul>
  )
}
