import { useNavigate, useSearch } from "@tanstack/react-router"

import { PageHeader } from "@/components/app/page-header"
import { PeriodControl } from "@/components/app/period-control"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePeriodSearch } from "@/features/analytics/hooks"
import { usePageTitle } from "@/features/dashboard/components/page-title"
import { useT } from "@/lib/i18n/use-t"
import { insightsSearchSchema, insightsTabs } from "../schemas"
import { MarketplaceInsights } from "./marketplace-insights"
import { RevenueInsights } from "./revenue-insights"
import { UsersInsights } from "./users-insights"

// Admin Insights (step 11.7-r10): one period control over the platform report tabs; tab and period live in the URL.
export function InsightsPage() {
  const { t } = useT()
  const title = t("dashboard.nav_insights")
  usePageTitle(title)
  const { tab } = insightsSearchSchema.parse(useSearch({ strict: false }))
  const { query, setQuery } = usePeriodSearch()
  const navigate = useNavigate()
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title}>
        <PeriodControl value={query} onChange={setQuery} />
      </PageHeader>
      <Tabs
        value={tab}
        onValueChange={(next) =>
          void navigate({
            to: ".",
            search: (prev: Record<string, unknown>) => ({
              ...prev,
              tab: insightsTabs.find((x) => x === next && x !== "marketplace"),
            }),
            replace: true,
            resetScroll: false,
            viewTransition: false,
          })
        }
      >
        <div className="overflow-x-auto">
          <TabsList aria-label={t("reports.tabs_label")} className="min-w-max">
            {insightsTabs.map((x) => (
              <TabsTrigger key={x} value={x}>
                {t(`reports.tab_${x}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="marketplace" className="pt-2">
          <MarketplaceInsights query={query} />
        </TabsContent>
        <TabsContent value="users" className="pt-2">
          <UsersInsights query={query} />
        </TabsContent>
        <TabsContent value="revenue" className="pt-2">
          <RevenueInsights query={query} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
