import { useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { AreaChartCard } from "@/components/app/area-chart-card"
import { BarChartCard } from "@/components/app/bar-chart-card"
import { PeriodControl } from "@/components/app/period-control"
import { PeriodNote } from "@/components/app/period-note"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { listingQueries } from "@/features/listings/queries"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { reportChart } from "@/features/analytics/chart-props"
import { presetQuery } from "@/features/analytics/schemas"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import type { Listing } from "@sayaratak/shared/schemas/listing"

// Views, contacts and totals of one listing, for a period.
export function ListingAnalyticsSheet({
  listing,
  onClose,
}: {
  listing: Listing
  onClose: () => void
}) {
  const { t, locale } = useT()
  const [period, setPeriod] = useState<PeriodQuery>(presetQuery("30d"))
  const { data, isPending, isError, refetch } = useQuery(
    listingQueries.analytics(listing.id, period)
  )
  const totals = data?.totals
  const chart = {
    ...reportChart({
      t,
      period: data?.period,
      rows: data?.series,
      previous: data?.previousSeries,
      events: true,
    }),
    loading: isPending,
    error: isError,
    onRetry: () => void refetch(),
  }
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-4 overflow-y-auto p-6 sm:max-w-xl">
        <SheetHeader className="p-0">
          <SheetTitle>{t("manager.analytics_title")}</SheetTitle>
          <p className="truncate text-ui text-muted-foreground">
            <bdi>{listing.title}</bdi>
          </p>
        </SheetHeader>
        <PeriodControl value={period} onChange={setPeriod} />
        <PeriodNote period={data?.period} hourlySince={data?.hourlySince} />
        <AreaChartCard
          title={t("manager.chart_views")}
          series={[{ key: "views", label: t("manager.col_views") }]}
          {...chart}
        />
        <BarChartCard
          title={t("manager.chart_contacts")}
          series={[
            { key: "phoneClicks", label: t("manager.metric_calls") },
            { key: "whatsappClicks", label: t("manager.metric_whatsapp") },
          ]}
          {...chart}
        />
        {totals && (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ["manager.col_views", totals.views],
                ["manager.col_favorites", totals.favorites],
                ["manager.metric_calls", totals.phoneClicks],
                ["manager.metric_whatsapp", totals.whatsappClicks],
                ["manager.metric_shares", totals.shares],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-caption text-muted-foreground">
                  {t(label)}
                </dt>
                <dd className="text-title font-semibold num">
                  {formatNumber(value, locale)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </SheetContent>
    </Sheet>
  )
}
