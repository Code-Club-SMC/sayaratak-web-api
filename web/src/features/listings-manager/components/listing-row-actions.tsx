import { useNavigate } from "@tanstack/react-router"

import { RowActions, type RowAction } from "@/components/app/row-actions"
import { useT } from "@/lib/i18n/use-t"
import { useNow } from "@/lib/now"
import type { Listing } from "@/schemas/listing"
import { canRenew, type useListingActions } from "../use-listing-actions"

export type ListingActions = ReturnType<typeof useListingActions>

// The "..." menu of one listing. Promote joins it in step 8.5.
export function ListingRowActions({
  listing,
  actions,
  onAnalytics,
}: {
  listing: Listing
  actions: ListingActions
  onAnalytics: (listing: Listing) => void
}) {
  const { t, locale } = useT()
  const now = useNow()
  const navigate = useNavigate()
  const list: RowAction[] = [
    ...(listing.moderation === "approved"
      ? [
          {
            key: "view",
            label: t("manager.action_view"),
            onSelect: () =>
              void navigate({
                to: "/$locale/listing/$slug",
                params: { locale, slug: listing.slug },
              }),
          },
        ]
      : []),
    {
      key: "edit",
      label: t("common.edit"),
      onSelect: () =>
        void navigate({
          to: "/$locale/post",
          params: { locale },
          search: { edit: listing.id },
        }),
    },
    {
      key: "renew",
      label: t("manager.action_renew"),
      disabled: !canRenew(listing, now),
      onSelect: () => actions.renew(listing),
    },
    {
      key: "duplicate",
      label: t("manager.action_duplicate"),
      onSelect: () => actions.duplicate(listing),
    },
    {
      key: "analytics",
      label: t("manager.action_analytics"),
      onSelect: () => onAnalytics(listing),
    },
    {
      key: "delete",
      label: t("manager.action_delete"),
      onSelect: () => actions.remove(listing),
      destructive: {
        title: t("manager.delete_title"),
        description: t("manager.delete_body", { title: listing.title }),
      },
    },
  ]
  return <RowActions label={listing.title} actions={list} />
}
