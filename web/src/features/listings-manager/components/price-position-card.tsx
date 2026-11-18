import { useQuery } from "@tanstack/react-query"

import { PriceText } from "@/components/app/price-text"
import { SectionError } from "@/components/app/section-error"
import { Skeleton } from "@/components/ui/skeleton"
import {
  PriceBandCell,
  PriceRange,
} from "@/features/dealer-reports/components/price-cells"
import { listingQueries } from "@/features/listings/queries"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { PRICE_MIN_COMPARABLES } from "@sayaratak/shared/lib/price-position"

// The listing's price against the same car on the market now (step 11.7-r7), for dealers and personal sellers alike.
export function PricePositionCard({ id }: { id: string }) {
  const { t, locale } = useT()
  const { data, isPending, isError, refetch } = useQuery(
    listingQueries.price(id)
  )
  if (isError)
    return (
      <SectionError
        message={t("reports.price_load_error")}
        onRetry={() => void refetch()}
      />
    )
  return (
    <section
      aria-labelledby={`price-${id}`}
      className="flex flex-col gap-3 rounded-xl bg-card p-5"
    >
      <h3 id={`price-${id}`} className="text-ui font-medium">
        {t("reports.price_title")}
      </h3>
      {isPending ? (
        <Skeleton className="h-12 w-full" aria-hidden="true" />
      ) : data.state === "ok" && data.median !== null ? (
        <>
          <PriceBandCell position={data} />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-caption">
            <dt className="text-muted-foreground">
              {t("reports.col_market_price")}
            </dt>
            <dd>
              <PriceText price={data.median} size="table" />
            </dd>
            <dt className="text-muted-foreground">
              {t("reports.col_middle_half")}
            </dt>
            <dd>
              <PriceRange position={data} />
            </dd>
            <dt className="text-muted-foreground">
              {t("reports.col_comparables")}
            </dt>
            <dd className="num">{formatNumber(data.comparables, locale)}</dd>
          </dl>
        </>
      ) : (
        <p className="text-ui text-muted-foreground">
          {data.state === "few"
            ? t("reports.price_thin_long", {
                value: formatNumber(data.comparables, locale),
                min: formatNumber(PRICE_MIN_COMPARABLES, locale),
              })
            : t("reports.price_none_long")}
        </p>
      )}
      <p className="text-caption text-muted-foreground">
        {t("reports.price_rules")}
      </p>
    </section>
  )
}
