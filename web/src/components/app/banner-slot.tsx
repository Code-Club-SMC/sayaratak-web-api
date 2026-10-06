import { useQuery } from "@tanstack/react-query"

import { useT } from "@/lib/i18n/use-t"
import { useDelayedFlag } from "@/lib/use-delayed-flag"
import { cn } from "@/lib/utils"
import type { Banner } from "@/schemas/admin"
import { bannersQuery } from "@/features/pages/queries"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BannerItem } from "./banner-item"

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
        aria-label={t("nav.loading_advertisement")}
        className={cn(
          "w-full",
          variant === "hero"
            ? "aspect-[3/1] rounded-xl md:aspect-[4/1] md:rounded-2xl"
            : "aspect-[6/1] rounded-lg"
        )}
      />
    ) : null
  if (isError)
    return (
      <div role="status" className="flex flex-wrap items-center gap-2 text-ui">
        <p>{t("nav.banner_error")}</p>
        <Button
          variant="ghost"
          onClick={() => {
            void refetch()
          }}
        >
          {t("common.retry")}
        </Button>
      </div>
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
