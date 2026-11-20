import { useQuery } from "@tanstack/react-query"

import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { priceReportQuery } from "../queries"
import type { ReportsSearch } from "../schemas"
import { PriceReportTable } from "./price-report-table"

// Where each live listing's price sits against the same car on the market now (step 11.7-r7); the period control does not apply.
export function PriceReport({ search }: { search: ReportsSearch }) {
  const { t, locale } = useT()
  const report = useQuery(
    priceReportQuery({ band: search.band, page: search.page })
  )
  const { data, isPending } = report
  const summary = data?.summary
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-prose text-ui text-muted-foreground">
        {t("reports.price_intro")}
      </p>
      <div className="stat-grid">
        <div className="grid grid-cols-2 xl:grid-cols-4">
          {(["below", "around", "above", "unknown"] as const).map((key) => (
            <StatCard
              key={key}
              label={t(`reports.price_filter_${key}`)}
              value={summary?.[key]}
              detail={t("reports.price_of_live", {
                value: formatNumber(summary?.live ?? 0, locale),
              })}
              loading={isPending}
            />
          ))}
        </div>
      </div>
      <PriceReportTable search={search} report={report} />
    </div>
  )
}
