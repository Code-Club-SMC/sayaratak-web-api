import { useSearch } from "@tanstack/react-router"

import { OverviewHeader } from "@/features/dashboard/components/overview-header"
import { overviewSearchSchema } from "../schemas"
import { NeedsAttentionCard } from "./needs-attention-card"
import { OverviewStats } from "./overview-stats"
import { RecentActivity } from "./recent-activity"
import { WelcomeNotice } from "./welcome-notice"

// The first screen of the personal account: notices, four numbers, what needs doing and the latest notifications. The views chart lives on Reports (step 11.7-r14).
export function AccountOverviewPage() {
  const { welcome } = overviewSearchSchema.parse(useSearch({ strict: false }))
  return (
    <div className="flex flex-col gap-6">
      <OverviewHeader reports="/$locale/account/reports" />
      {welcome === 1 && <WelcomeNotice />}
      <OverviewStats />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <NeedsAttentionCard />
        <RecentActivity />
      </div>
    </div>
  )
}
