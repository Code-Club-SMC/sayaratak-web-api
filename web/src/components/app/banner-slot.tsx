import { useQuery } from "@tanstack/react-query"

import { useT } from "@/lib/i18n/use-t"
import { useDelayedFlag } from "@/lib/use-delayed-flag"
import { cn } from "@/lib/utils"
import type { Banner } from "@/schemas/admin"
import { bannersQuery } from "@/features/pages/queries"
import { Skeleton } from "@/components/ui/skeleton"
import { BannerItem } from "./banner-item"
import { SectionError } from "./section-error"

// `variant="hero"` shows only the first banner, tall, at the top of the home page.
export function BannerSlot({
  placement,
  variant = "strip",
}: {
  placement: Banner["placement"]
  variant?: "strip" | "hero"
}) {
  const { t } = useT()
  const { data, isPending, isError, refetch } = useQuery(
    bannersQuery(placement)
  )
  const delayed = useDelayedFlag(isPending)
  if (isPending)
    return delayed ? (
      <Skeleton
        role="status"
        aria-label={t("nav.loading_advertisement")}
        className={cn(
          "w-full",
          variant === "hero"
            ? "aspect-[2/1] rounded-xl md:aspect-[3/1] md:rounded-2xl"
            : "h-24 rounded-xl md:h-36"
        )}
      />
    ) : null
  if (isError)
    return (
      <SectionError
        message={t("nav.banner_error")}
        onRetry={() => {
          void refetch()
        }}
      />
    )
  if (!data.length) return null
  return (
    <aside aria-label={t("nav.advertisement")} className="space-y-4">
      {(variant === "hero" ? data.slice(0, 1) : data).map((banner) => (
        <BannerItem key={banner.id} banner={banner} variant={variant} />
      ))}
    </aside>
  )
}
