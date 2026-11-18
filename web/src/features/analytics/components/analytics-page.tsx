import { PageHeader } from "@/components/app/page-header"
import { PeriodControl } from "@/components/app/period-control"
import { usePageTitle } from "@/features/dashboard/components/page-title"
import { useT } from "@/lib/i18n/use-t"
import { usePeriodSearch } from "../hooks"
import { PerformanceReport } from "./performance-report"

// Workshop and mechanic Analytics (dealerships use Reports, step 11.7-r5): the period control over the Performance report. The period lives in the URL.
export function AnalyticsPage({ role }: { role: "workshop" | "mechanic" }) {
  const { t } = useT()
  const title = t("dashboard.nav_analytics")
  usePageTitle(title)
  const { query, setQuery } = usePeriodSearch()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title}>
        <PeriodControl value={query} onChange={setQuery} />
      </PageHeader>
      <PerformanceReport role={role} query={query} />
    </div>
  )
}
