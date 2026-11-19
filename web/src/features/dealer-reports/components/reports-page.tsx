import { useEffect, useRef } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"

import { PageHeader } from "@/components/app/page-header"
import { PeriodControl } from "@/components/app/period-control"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePeriodSearch } from "@/features/analytics/hooks"
import { PerformanceReport } from "@/features/analytics/components/performance-report"
import { usePageTitle } from "@/features/dashboard/components/page-title"
import { useT } from "@/lib/i18n/use-t"
import {
  type ReportsRole,
  type ReportsSearch,
  type ReportsTab,
  reportsSearchSchema,
  tabsOf,
} from "../schemas"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import { AdsReport } from "./ads-report"
import { AlertsReport } from "./alerts-report"
import { DemandReport } from "./demand-report"
import { ListingsReport } from "./listings-report"
import { PriceReport } from "./price-report"
import { PromotionsReport } from "./promotions-report"
import { RankReport } from "./rank-report"
import { RepliesReport } from "./replies-report"
import { ReviewsReport } from "./reviews-report"
import { SpendingReport } from "./spending-report"

// Reports (steps 11.7-r5 to r9): one period control over the role's tabs (Price ignores it). Tab, period, filter, sort and page live in the URL.
export function ReportsPage({ role }: { role: ReportsRole }) {
  const { t } = useT()
  const title = t("dashboard.nav_business_reports")
  usePageTitle(title)
  const tabs = tabsOf(role)
  const parsed = reportsSearchSchema.parse(useSearch({ strict: false }))
  // A tab of another role (an old or hand-typed link) opens Performance.
  const search = tabs.includes(parsed.tab)
    ? parsed
    : { ...parsed, tab: "performance" as const }
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
                  ? tabs.find((tab) => tab === next)
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
        {/* The dealer's seven tabs do not fit a phone row: the row scrolls sideways and keeps the active tab in view (owner, step 11.7-r6). */}
        <div ref={row} className="overflow-x-auto">
          <TabsList aria-label={t("reports.tabs_label")} className="min-w-max">
            {tabs.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(`reports.tab_${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {tabs.map((tab) => (
          <TabsContent key={tab} value={tab} className="pt-2">
            <TabBody tab={tab} role={role} search={search} query={query} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

// One tab's report.
function TabBody({
  tab,
  role,
  search,
  query,
}: {
  tab: ReportsTab
  role: ReportsRole
  search: ReportsSearch
  query: PeriodQuery
}) {
  switch (tab) {
    case "performance":
      return <PerformanceReport role={role} query={query} />
    case "listings":
      return <ListingsReport search={search} />
    case "price":
      return <PriceReport search={search} />
    case "promotions":
      return <PromotionsReport query={query} campaigns={role !== "user"} />
    case "demand":
      return <DemandReport query={query} />
    case "ads":
      return role === "workshop" || role === "mechanic" ? (
        <AdsReport role={role} query={query} />
      ) : null
    case "rank":
      return role === "workshop" || role === "mechanic" ? (
        <RankReport role={role} query={query} />
      ) : null
    case "replies":
      return <RepliesReport query={query} role={role} />
    case "reviews":
      return <ReviewsReport query={query} />
    case "spending":
      return <SpendingReport query={query} />
    case "alerts":
      return <AlertsReport query={query} />
  }
}
