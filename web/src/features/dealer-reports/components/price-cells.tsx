import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type {
  PriceBand,
  PricePosition,
} from "@sayaratak/shared/schemas/reports-price"

const VARIANT: Record<PriceBand, "primary" | "success" | "warning"> = {
  below: "primary",
  around: "success",
  above: "warning",
}

// The band with the gap ("Above market +30%"); without a band, why there is none.
export function PriceBandCell({ position }: { position: PricePosition }) {
  const { t, locale } = useT()
  if (position.band === null)
    return (
      <span className="text-caption text-muted-foreground">
        {position.state === "few"
          ? t("reports.price_thin", {
              value: formatNumber(position.comparables, locale),
            })
          : t("reports.price_none")}
      </span>
    )
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Badge variant={VARIANT[position.band]}>
        {t(`reports.price_band_${position.band}`)}
      </Badge>
      <GapText gap={position.gapPct ?? 0} />
    </span>
  )
}

export function GapText({ gap }: { gap: number }) {
  const { locale } = useT()
  const sign = gap > 0 ? "+" : gap < 0 ? "−" : ""
  return (
    <bdi dir="ltr" className="text-caption num">
      {sign}
      {formatNumber(Math.abs(gap), locale)}%
    </bdi>
  )
}

// The middle half of the comparables' prices ("9,000,000 – 11,000,000"), or a dash.
export function PriceRange({ position }: { position: PricePosition }) {
  const { t, locale } = useT()
  if (position.low === null || position.high === null)
    return <span aria-label={t("reports.price_no_market")}>—</span>
  return (
    <bdi dir="ltr" className="num">
      {formatNumber(position.low, locale)} –{" "}
      {formatNumber(position.high, locale)}
    </bdi>
  )
}
