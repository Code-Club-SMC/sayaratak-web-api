import type { UseQueryResult } from "@tanstack/react-query"

import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { useT } from "@/lib/i18n/use-t"
import type { AdminStats } from "@sayaratak/shared/schemas/responses"

type GrowthKey = Exclude<keyof AdminStats["series"], "newListings" | "revenue">
// Two rows of four site totals, each a link to the screen that lists what it counts. Revenue follows the period (its change is against the compare window); the counts are of now, each with what joined per day and how many joined in 30 days.
export function AdminStatGrid({
  stats,
}: {
  stats: UseQueryResult<AdminStats>
}) {
  const { t, locale } = useT()
  if (stats.isError)
    return (
      <SectionError
        message={t("dashboard.overview_stats_error")}
        onRetry={() => void stats.refetch()}
      />
    )
  const totals = stats.data?.totals
  const params = { locale }
  // A total card: its line is what joined per day over the 30 days, and the figure under it how many joined
  // ("+295 in 30 days"). A percentage of a young total reads as noise (300 against 5 is +5,900%).
  const growth = (key: GrowthKey) => {
    const points = stats.data?.series[key]
    if (!points) return {}
    return {
      spark: points.map((p) => p.value),
      added: points.reduce((sum, p) => sum + p.value, 0),
    }
  }
  return (
    <div className="stat-grid">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("admin.overview_users")}
          {...growth("newUsers")}
          value={totals?.users}
          link={{ to: "/$locale/admin/users", params }}
        />
        <StatCard
          label={t("admin.overview_listings")}
          {...growth("newLiveListings")}
          value={totals?.listings}
          link={{
            to: "/$locale/admin/listings",
            params,
            search: { tab: "approved" },
          }}
        />
        <StatCard
          label={t("admin.overview_vehicles")}
          {...growth("newVehicles")}
          value={totals?.vehicles}
          link={{
            to: "/$locale/admin/listings",
            params,
            search: { tab: "approved", type: "vehicle" },
          }}
        />
        <StatCard
          label={t("dashboard.nav_dealerships")}
          {...growth("newDealerships")}
          value={totals?.dealerships}
          link={{ to: "/$locale/admin/dealerships", params }}
        />
        <StatCard
          label={t("dashboard.nav_workshops")}
          {...growth("newWorkshops")}
          value={totals?.workshops}
          link={{ to: "/$locale/admin/workshops", params }}
        />
        <StatCard
          label={t("dashboard.nav_mechanics")}
          {...growth("newMechanics")}
          value={totals?.mechanics}
          link={{ to: "/$locale/admin/mechanics", params }}
        />
        <StatCard
          label={t("admin.overview_subscriptions")}
          {...growth("newSubscriptions")}
          value={totals?.activeSubscriptions}
          link={{
            to: "/$locale/admin/plans",
            params,
            search: { tab: "subscribers" },
          }}
        />
        <StatCard
          label={t("admin.overview_revenue")}
          value={totals?.revenue}
          previous={stats.data?.previousRevenue}
          compare={stats.data?.period.compare}
          spark={stats.data?.series.revenue.map((p) => p.value)}
          link={{
            to: "/$locale/admin/payments",
            params,
            search: { tab: "approved" },
          }}
        />
      </div>
    </div>
  )
}
