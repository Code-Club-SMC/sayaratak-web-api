import { useSearch } from "@tanstack/react-router"

import { AvailabilityCard } from "@/features/mechanic-overview/components/availability-card"
import { WelcomeNotice } from "@/features/account-overview/components/welcome-notice"
import { overviewSearchSchema } from "@/features/account-overview/schemas"
import { SubscriptionCard } from "@/features/billing/components/subscription-card"
import { OverviewHeader } from "@/features/dashboard/components/overview-header"
import { SetupChecklist } from "@/features/onboarding/components/setup-checklist"
import { RecentReviewsCard } from "@/features/reviews/components/recent-reviews-card"
import { WorkshopStats } from "./workshop-stats"

// The first screen of a workshop or a mechanic: availability (mechanic only), setup until done, five numbers for the last 30 days, the newest reviews with a reply in place, and the plan. Charts live on Reports (step 11.7-r14).
export function WorkshopOverviewPage({
  role = "workshop",
}: {
  role?: "workshop" | "mechanic"
}) {
  const { welcome } = overviewSearchSchema.parse(useSearch({ strict: false }))
  return (
    <div className="flex flex-col gap-6">
      <OverviewHeader
        reports={
          role === "workshop"
            ? "/$locale/workshop/reports"
            : "/$locale/mechanic/reports"
        }
      />
      {welcome === 1 && <WelcomeNotice role={role} />}
      {role === "mechanic" && <AvailabilityCard />}
      <SetupChecklist />
      <WorkshopStats role={role} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <RecentReviewsCard targetType={role} />
        <SubscriptionCard role={role} />
      </div>
    </div>
  )
}
