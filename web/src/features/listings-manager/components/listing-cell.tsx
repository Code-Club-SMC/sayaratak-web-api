import { MediaImage } from "@/components/app/media-image"
import type { Listing } from "@/schemas/listing"

// Thumbnail, title and the short id a seller quotes in a search.
export function ListingCell({ listing }: { listing: Listing }) {
  const cover = listing.media[0]
  return (
    <div className="flex min-w-0 items-center gap-3">
      <MediaImage
        src={cover?.url ?? null}
        alt=""
        placeholderColor={cover?.placeholderColor}
        sizes="64px"
        className="size-12 shrink-0 rounded-lg"
      />
      <div className="flex min-w-0 flex-col">
        <span className="max-w-56 truncate text-ui font-medium">
          <bdi>{listing.title}</bdi>
        </span>
        <span className="text-caption text-muted-foreground">
          <bdi>{listing.id}</bdi>
        </span>
      </div>
    </div>
  )
}
