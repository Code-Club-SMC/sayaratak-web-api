import { PriceText } from "@/components/app/price-text"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { PriceReportRow } from "@sayaratak/shared/schemas/reports-price"
import { ListingTitleCell } from "./listing-cells"
import { PriceBandCell, PriceRange } from "./price-cells"

// One Price report row below md.
export function PriceReportCard({ row }: { row: PriceReportRow }) {
  const { t, locale } = useT()
  const { position } = row
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg p-2">
      <ListingTitleCell row={row} />
      <PriceBandCell position={position} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-caption">
        <dt className="text-muted-foreground">{t("reports.col_your_price")}</dt>
        <dd>
          <PriceText price={row.price} period={row.rentPeriod} size="table" />
        </dd>
        <dt className="text-muted-foreground">
          {t("reports.col_market_price")}
        </dt>
        <dd>
          {position.median === null ? (
            <span aria-label={t("reports.price_no_market")}>—</span>
          ) : (
            <PriceText price={position.median} size="table" />
          )}
        </dd>
        <dt className="text-muted-foreground">
          {t("reports.col_middle_half")}
        </dt>
        <dd>
          <PriceRange position={position} />
        </dd>
        <dt className="text-muted-foreground">
          {t("reports.col_comparables")}
        </dt>
        <dd className="num">{formatNumber(position.comparables, locale)}</dd>
      </dl>
    </div>
  )
}
