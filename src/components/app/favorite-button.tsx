import { useQuery } from "@tanstack/react-query"
import { HeartIcon } from "lucide-react"

import { meQuery } from "@/features/auth/me-query"
import { useRequireAuth } from "@/features/auth/auth-gate"
import { favoriteQueries, useToggleFavorite } from "@/features/listings/queries"
import { useT } from "@/lib/i18n/use-t"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/toast"

// `overlay` is the white circle that sits on a card photo, `plain` is the bare icon for the detail page.
export function FavoriteButton({
  listingId,
  variant = "overlay",
  className,
}: {
  listingId: string
  variant?: "overlay" | "plain"
  className?: string
}) {
  const { t } = useT()
  const requireAuth = useRequireAuth()
  const { data: me } = useQuery(meQuery)
  const { data: ids } = useQuery({ ...favoriteQueries.ids, enabled: !!me })
  const { mutate } = useToggleFavorite()
  const active = ids?.includes(listingId) ?? false
  const toggle = () =>
    requireAuth(() => {
      mutate({ id: listingId, on: !active })
      if (active)
        toast.add({
          title: t("toast.favorite_removed"),
          actionProps: {
            children: t("common.undo"),
            onClick: () => mutate({ id: listingId, on: true }),
          },
        })
    })
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={t("listing.favorite_add")}
      onClick={toggle}
      className={cn(
        "grid size-11 place-items-center rounded-full md:size-10",
        className
      )}
    >
      <span
        className={cn(
          "grid size-9 place-items-center rounded-full",
          variant === "overlay" ? "bg-card" : "hover:bg-muted"
        )}
      >
        <HeartIcon
          aria-hidden="true"
          strokeWidth={1.5}
          className={cn(
            "size-5",
            active ? "fill-primary text-primary" : "text-foreground"
          )}
        />
      </span>
    </button>
  )
}
