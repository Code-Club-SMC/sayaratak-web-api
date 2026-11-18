import { useNavigate, useSearch } from "@tanstack/react-router"

import { PageHeader } from "@/components/app/page-header"
import { PeriodControl } from "@/components/app/period-control"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePeriodSearch } from "@/features/analytics/hooks"
import { PerformanceReport } from "@/features/analytics/components/performance-report"
import { usePageTitle } from "@/features/dashboard/components/page-title"
import { useT } from "@/lib/i18n/use-t"
import { reportsSearchSchema, reportsTabs } from "../schemas"
import { ListingsReport } from "./listings-report"

// The dealer's Reports (step 11.7-r5): one period control over the Performance and Listings tabs. Tab, period, filter, sort and page live in the URL.
export function ReportsPage() {
  const { t } = useT()
  const title = t("dashboard.nav_business_reports")
  usePageTitle(title)
  const search = reportsSearchSchema.parse(useSearch({ strict: false }))
  const { query, setQuery } = usePeriodSearch()
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title}>
        <PeriodControl value={query} onChange={setQuery} />
      </PageHeader>
      <Tabs
        value={search.tab}
        onValueChange={(next) =>
          void navigate({
            to: ".",
            search: (prev: Record<string, unknown>) => ({
              ...prev,
              tab: next === "listings" ? next : undefined,
            }),
            replace: true,
            resetScroll: false,
            viewTransition: false,
          })
        }
      >
        <TabsList aria-label={t("reports.tabs_label")}>
          {reportsTabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(`reports.tab_${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="performance" className="pt-2">
          <PerformanceReport role="dealership" query={query} />
        </TabsContent>
        <TabsContent value="listings" className="pt-2">
          <ListingsReport search={search} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
