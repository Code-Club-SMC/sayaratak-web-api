import { BarListCard } from "@/components/app/bar-list-card"
import { useT } from "@/lib/i18n/use-t"
import type { ListingsReport } from "@sayaratak/shared/schemas/reports"

// How long the live listings have been up, in five age bands.
export function StockAgeCard({
  buckets,
  loading,
}: {
  buckets?: ListingsReport["summary"]["stockAge"]
  loading?: boolean
}) {
  const { t } = useT()
  return (
    <BarListCard
      title={t("reports.stock_age_title")}
      loading={loading}
      rows={buckets?.map((b) => ({
        key: b.key,
        label: t(`reports.age_${b.key}`),
        value: b.count,
      }))}
    />
  )
}
