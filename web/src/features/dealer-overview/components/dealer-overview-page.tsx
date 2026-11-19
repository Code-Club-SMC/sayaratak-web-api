import { useSearch } from "@tanstack/react-router"

import { WelcomeNotice } from "@/features/account-overview/components/welcome-notice"
import { overviewSearchSchema } from "@/features/account-overview/schemas"
import { NeedsAttentionCard } from "@/features/account-overview/components/needs-attention-card"
import { SubscriptionCard } from "@/features/billing/components/subscription-card"
import { OverviewHeader } from "@/features/dashboard/components/overview-header"
import { SetupChecklist } from "@/features/onboarding/components/setup-checklist"
import { DealerStats } from "./dealer-stats"

// The first screen of a dealership: setup until done, five numbers for the last 30 days, the plan and what needs doing. Charts and the funnel live on Reports (step 11.7-r14).
export function DealerOverviewPage() {
  const { welcome } = overviewSearchSchema.parse(useSearch({ strict: false }))
  return (
    <div className="flex flex-col gap-6">
      <OverviewHeader reports="/$locale/dealer/reports" />
      {welcome === 1 && <WelcomeNotice role="dealership" />}
      <SetupChecklist />
      <DealerStats />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <NeedsAttentionCard withPending />
        <SubscriptionCard role="dealership" />
      </div>
    </div>
  )
}
