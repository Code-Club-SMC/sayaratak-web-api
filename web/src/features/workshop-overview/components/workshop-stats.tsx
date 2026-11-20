import { useQuery } from "@tanstack/react-query"

import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { analyticsQuery } from "@/features/analytics/queries"
import { businessQueries } from "@/features/directory/queries"
import { countsQuery } from "@/features/notifications/counts-query"
import { useT } from "@/lib/i18n/use-t"

const paths = {
  workshop: {
    reports: "/$locale/workshop/reports",
    inquiries: "/$locale/workshop/inquiries",
    reviews: "/$locale/workshop/reviews",
  },
  mechanic: {
    reports: "/$locale/mechanic/reports",
    inquiries: "/$locale/mechanic/inquiries",
    reviews: "/$locale/mechanic/reviews",
  },
} as const

// Five numbers on the workshop and mechanic overviews, each a link to the page that explains it. Views, calls and WhatsApp count the last 30 days (with a trend line); unread inquiries and the rating are counts of now.
export function WorkshopStats({
  role = "workshop",
}: {
  role?: "workshop" | "mechanic"
}) {
  const { t, locale } = useT()
  const analytics = useQuery(analyticsQuery("30d"))
  const counts = useQuery(countsQuery)
  const business = useQuery(businessQueries.mine)
  const queries = [analytics, counts, business]
  if (queries.some((q) => q.isError))
    return (
      <SectionError
        message={t("dashboard.overview_stats_error")}
        onRetry={() => queries.forEach((q) => void q.refetch())}
      />
    )
  const totals = analytics.data?.totals
  const previous = analytics.data?.previous
  const rating =
    business.data && "rating" in business.data
      ? business.data.rating
      : undefined
  const daily = analytics.data?.daily
  const toReports = { to: paths[role].reports, params: { locale } } as const
  return (
    <div className="stat-grid">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label={t("analytics.stat_profile_views")}
          value={totals?.views}
          previous={previous?.views}
          spark={daily?.map((d) => d.views)}
          link={toReports}
        />
        <StatCard
          label={t("analytics.stat_calls")}
          value={totals?.calls}
          previous={previous?.calls}
          spark={daily?.map((d) => d.calls)}
          link={toReports}
        />
        <StatCard
          label={t("analytics.stat_whatsapp")}
          value={totals?.whatsapp}
          previous={previous?.whatsapp}
          spark={daily?.map((d) => d.whatsapp)}
          link={toReports}
        />
        <StatCard
          label={t("dashboard.workshop_stat_inquiries")}
          value={counts.data?.unreadMessages}
          link={{ to: paths[role].inquiries, params: { locale } }}
        />
        <StatCard
          label={t("dashboard.dealer_stat_rating")}
          // One decimal, like the stars on the public profile.
          value={rating && Math.round(rating.avg * 10) / 10}
          detail={
            rating && t("directory.reviews_count", { count: rating.count })
          }
          link={{ to: paths[role].reviews, params: { locale } }}
        />
      </div>
    </div>
  )
}
