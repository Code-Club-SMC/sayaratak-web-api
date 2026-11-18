import { formatDate, formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { ListingsReportRow } from "@sayaratak/shared/schemas/reports"
import { ListingStateBadge, ListingTitleCell, RateText } from "./listing-cells"

// One Listings report row below md.
export function ListingReportCard({ row }: { row: ListingsReportRow }) {
  const { t, locale } = useT()
  const num = (n: number) => formatNumber(n, locale)
  return (
    <div className="flex flex-col items-start gap-2 rounded-lg p-2">
      <ListingTitleCell row={row} />
      <ListingStateBadge row={row} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-caption">
        <dt className="text-muted-foreground">{t("analytics.col_views")}</dt>
        <dd className="num">{num(row.views)}</dd>
        <dt className="text-muted-foreground">{t("analytics.col_contacts")}</dt>
        <dd className="num">{num(row.contacts)}</dd>
        <dt className="text-muted-foreground">{t("reports.col_rate")}</dt>
        <dd className="num">
          <RateText rate={row.contactRate} />
        </dd>
        <dt className="text-muted-foreground">{t("reports.col_days_live")}</dt>
        <dd className="num">{num(row.daysLive)}</dd>
        <dt className="text-muted-foreground">{t("reports.col_expires")}</dt>
        <dd>{formatDate(row.expiresAt, locale)}</dd>
      </dl>
    </div>
  )
}
