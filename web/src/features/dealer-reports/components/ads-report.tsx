import { useQuery } from "@tanstack/react-query"

import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { ShellLink } from "@/components/app/shell-link"
import { buttonVariants } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"
import { dashboardPath } from "@/lib/navigation"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import { promotionsReportQuery } from "../queries"
import { CampaignsSection } from "./campaigns-section"

// Workshops and mechanics promote with banner campaigns only (no listings to feature): the campaigns of the Promotions report (step 11.7-r8).
export function AdsReport({
  role,
  query,
}: {
  role: "workshop" | "mechanic"
  query: PeriodQuery
}) {
  const { t } = useT()
  const report = useQuery(promotionsReportQuery(query))
  const { data, isPending } = report
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      <CampaignsSection
        rows={data?.campaigns}
        period={data?.period}
        loading={isPending}
        emptyAction={
          <ShellLink
            path={`${dashboardPath(role)}/ads/new`}
            className={buttonVariants()}
          >
            {t("ads.new_campaign")}
          </ShellLink>
        }
      />
    </div>
  )
}
