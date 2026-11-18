import { Link } from "@tanstack/react-router"

import { MediaImage } from "@/components/app/media-image"
import { PriceText } from "@/components/app/price-text"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { PromotionReportRow } from "@sayaratak/shared/schemas/reports-promotions"

// Cover and title linking to the public page, with the promotion's type and how it was paid.
export function PromotionTitleCell({ row }: { row: PromotionReportRow }) {
  const { t, locale } = useT()
  return (
    <div className="flex min-w-0 items-center gap-3">
      <MediaImage
        src={row.coverUrl}
        alt=""
        sizes="48px"
        className="size-12 shrink-0 rounded-lg"
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <Link
          to="/$locale/listing/$slug"
          params={{ locale, slug: row.slug }}
          className="text-ui font-medium hover:text-primary md:max-w-xs md:truncate"
        >
          <bdi>{row.title}</bdi>
        </Link>
        <span className="text-caption text-muted-foreground">
          {t(`promotion.name_${row.type}`)} ·{" "}
          {t(`billing.promos_source_${row.source}`)}
        </span>
      </div>
    </div>
  )
}

const perDay = (count: number, days: number) =>
  days > 0 ? Math.round((count / days) * 10) / 10 : 0

// "before → during" per day, so stretches of different lengths compare.
export function BeforeDuring({
  row,
  measure,
}: {
  row: PromotionReportRow
  measure: "views" | "contacts"
}) {
  const { t, locale } = useT()
  const before = perDay(row.before[measure], row.before.days)
  const during = perDay(row.during[measure], row.during.days)
  if (row.extraContacts === null)
    return <span className="num">{formatNumber(during, locale)}</span>
  return (
    <span className="num">
      <span className="text-muted-foreground">
        {formatNumber(before, locale)}
      </span>
      <span aria-hidden="true">{locale === "ar" ? " ← " : " → "}</span>
      <span className="sr-only">{t("reports.promo_to")}</span>
      {formatNumber(during, locale)}
    </span>
  )
}

// SDG, or a dash when there is nothing to show.
export function MoneyCell({ amount }: { amount: number | null }) {
  return amount === null ? (
    <span className="text-muted-foreground">—</span>
  ) : (
    <PriceText price={amount} size="table" />
  )
}
