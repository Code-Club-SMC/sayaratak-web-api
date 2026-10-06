import { useQuery } from "@tanstack/react-query"

import { useT } from "@/lib/i18n/use-t"
import { useDelayedFlag } from "@/lib/use-delayed-flag"
import type { Banner } from "@/schemas/admin"
import { bannersQuery } from "@/features/pages/queries"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { BannerItem } from "./banner-item"

export function BannerSlot({ placement }: { placement: Banner["placement"] }) {
  const { t } = useT()
  const { data, isPending, isError, refetch } = useQuery(
    bannersQuery(placement)
  )
  const delayed = useDelayedFlag(isPending)
  if (isPending)
    return delayed ? (
      <Skeleton
        aria-label={t("nav.loading_advertisement")}
        className="aspect-[6/1] w-full rounded-lg"
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
      {data.map((banner) => (
        <BannerItem key={banner.id} banner={banner} />
      ))}
    </aside>
  )
}
