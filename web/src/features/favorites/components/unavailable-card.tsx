import { StatusBadge } from "@/components/app/status-badge"
import { RemoveButton } from "@/components/app/remove-button"
import { useListingTitle } from "@/hooks/use-listing-title"
import { useT } from "@/lib/i18n/use-t"
import type { FavoriteListing } from "@/schemas/listing"

// A saved listing that cannot be opened any more: its title, why, and a Remove button. No link, no photo.
export function UnavailableCard({
  listing,
  onRemove,
}: {
  listing: FavoriteListing
  onRemove: () => void
}) {
  const { t } = useT()
  const title = useListingTitle()(listing)
  return (
    <article className="flex flex-col items-start gap-2 rounded-xl bg-card p-3">
      {(listing.status === "sold" || listing.status === "rented") && (
        <StatusBadge status={listing.status} />
      )}
      <h3 className="line-clamp-2 min-h-[2lh] text-ui font-medium text-muted-foreground">
        <bdi>{title}</bdi>
      </h3>
      <p className="text-caption text-muted-foreground">
        {t("dashboard.favorites_unavailable")}
      </p>
      <RemoveButton
        variant="outline"
        className="mt-auto"
        title={t("dashboard.favorites_remove_title")}
        onConfirm={onRemove}
      >
        {t("common.remove")}
      </RemoveButton>
    </article>
  )
}
