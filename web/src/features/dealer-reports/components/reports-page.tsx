import { useEffect, useRef } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"

import { PageHeader } from "@/components/app/page-header"
import { PeriodControl } from "@/components/app/period-control"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePeriodSearch } from "@/features/analytics/hooks"
import { PerformanceReport } from "@/features/analytics/components/performance-report"
import { usePageTitle } from "@/features/dashboard/components/page-title"
import { useT } from "@/lib/i18n/use-t"
import { reportsSearchSchema, reportsTabs } from "../schemas"
import { DemandReport } from "./demand-report"
import { ListingsReport } from "./listings-report"
import { PriceReport } from "./price-report"
import { PromotionsReport } from "./promotions-report"
import { RepliesReport } from "./replies-report"
import { ReviewsReport } from "./reviews-report"

// The dealer's Reports (steps 11.7-r5 to r7): one period control over seven tabs (Price ignores it). Tab, period, filter, sort and page live in the URL.
export function ReportsPage() {
  const { t } = useT()
  const title = t("dashboard.nav_business_reports")
  usePageTitle(title)
  const search = reportsSearchSchema.parse(useSearch({ strict: false }))
  const { query, setQuery } = usePeriodSearch()
  const navigate = useNavigate()
  const row = useRef<HTMLDivElement>(null)
  useEffect(() => {
    row.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" })
  }, [search.tab])
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
              tab:
                next !== "performance"
                  ? reportsTabs.find((tab) => tab === next)
                  : undefined,
              // The page belongs to the tab it was picked on.
              page: undefined,
            }),
            replace: true,
            resetScroll: false,
            viewTransition: false,
          })
        }
      >
        {/* Seven tabs do not fit a phone row: the row scrolls sideways and keeps the active tab in view (owner, step 11.7-r6). */}
        <div ref={row} className="overflow-x-auto">
          <TabsList aria-label={t("reports.tabs_label")} className="min-w-max">
            {reportsTabs.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`reports.tab_${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="performance" className="pt-2">
          <PerformanceReport role="dealership" query={query} />
        </TabsContent>
        <TabsContent value="listings" className="pt-2">
          <ListingsReport search={search} />
        </TabsContent>
        <TabsContent value="price" className="pt-2">
          <PriceReport search={search} />
        </TabsContent>
        <TabsContent value="promotions" className="pt-2">
          <PromotionsReport query={query} />
        </TabsContent>
        <TabsContent value="demand" className="pt-2">
          <DemandReport query={query} />
        </TabsContent>
        <TabsContent value="replies" className="pt-2">
          <RepliesReport query={query} />
        </TabsContent>
        <TabsContent value="reviews" className="pt-2">
          <ReviewsReport query={query} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
