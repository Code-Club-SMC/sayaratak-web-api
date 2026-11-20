import { useQuery } from "@tanstack/react-query"

import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { formatPrice } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import { promotionsReportQuery } from "../queries"
import { CampaignsSection } from "./campaigns-section"
import { PromotionsTable } from "./promotions-table"

// Did paid visibility pay off: money spent, contacts the promotions added and the cost of each, per promotion, and the banner campaigns (step 11.7-r6).
// `campaigns`: banner campaigns are for businesses; a personal seller has none (step 11.7-r9).
export function PromotionsReport({
  query,
  campaigns = true,
}: {
  query: PeriodQuery
  campaigns?: boolean
}) {
  const { t, locale } = useT()
  const report = useQuery(promotionsReportQuery(query))
  const { data, isPending } = report
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  const summary = data?.summary
  const unit = formatPrice(0, locale).unit
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <div className="stat-grid">
        <div className="grid grid-cols-2 xl:grid-cols-3">
          <StatCard
            label={t("reports.stat_spent")}
            value={summary?.spent}
            detail={unit}
            loading={isPending}
          />
          <StatCard
            label={t("reports.stat_extra")}
            value={summary?.extraContacts}
            loading={isPending}
          />
          <StatCard
            label={t("reports.stat_cost_extra")}
            value={summary ? summary.costPerExtraContact : undefined}
            detail={summary?.costPerExtraContact != null ? unit : undefined}
            empty={t("reports.cost_not_enough")}
            loading={isPending}
          />
        </div>
      </div>
      <PromotionsTable rows={data?.promotions} loading={isPending} />
      {campaigns ? (
        <CampaignsSection
          rows={data?.campaigns}
          period={data?.period}
          loading={isPending}
        />
      ) : null}
    </div>
  )
}
