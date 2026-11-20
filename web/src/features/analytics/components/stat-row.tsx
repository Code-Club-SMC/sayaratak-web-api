import { StatCard } from "@/components/app/stat-card"
import { useT } from "@/lib/i18n/use-t"
import type { Analytics } from "@sayaratak/shared/schemas/responses"

type Role = "user" | "dealership" | "workshop" | "mechanic"
type Key = keyof Analytics["totals"]

// A dealership or personal seller counts listing views and favorites; a workshop or mechanic counts profile views and new reviews.
const listingStats: { key: Key; label: string }[] = [
  { key: "views", label: "analytics.stat_views" },
  { key: "calls", label: "analytics.stat_calls" },
  { key: "whatsapp", label: "analytics.stat_whatsapp" },
  { key: "messages", label: "analytics.stat_messages" },
  { key: "favorites", label: "analytics.stat_favorites" },
]
const stats: Record<Role, { key: Key; label: string }[]> = {
  user: listingStats,
  dealership: listingStats,
  workshop: [
    { key: "views", label: "analytics.stat_profile_views" },
    { key: "calls", label: "analytics.stat_calls" },
    { key: "whatsapp", label: "analytics.stat_whatsapp" },
    { key: "messages", label: "analytics.stat_messages" },
    { key: "newReviews", label: "analytics.stat_reviews" },
  ],
  mechanic: [
    { key: "views", label: "analytics.stat_profile_views" },
    { key: "calls", label: "analytics.stat_calls" },
    { key: "whatsapp", label: "analytics.stat_whatsapp" },
    { key: "messages", label: "analytics.stat_messages" },
    { key: "newReviews", label: "analytics.stat_reviews" },
  ],
}

// Counted per day on the public pages, so a comparison reaching the months kept as totals leaves them out.
const EVENT_KEYS = new Set<Key>(["views", "calls", "whatsapp"])
// The totals that also have a per-bucket series, for the trend line.
const SERIES: Partial<
  Record<Key, keyof Omit<Analytics["daily"][number], "date">>
> = {
  views: "views",
  calls: "calls",
  whatsapp: "whatsapp",
  messages: "messages",
}

// Five cards, each with its change against the compare window, its previous value and, where a series exists, its trend.
export function StatRow({
  role,
  data,
  loading,
}: {
  role: Role
  data?: Analytics
  loading?: boolean
}) {
  const { t } = useT()
  const notCompared = data ? !data.period.eventsCompared : false
  return (
    <div className="stat-grid">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        {stats[role].map(({ key, label }) => {
          const unavailable = notCompared && EVENT_KEYS.has(key)
          const series = SERIES[key]
          return (
            <StatCard
              key={key}
              label={t(label)}
              value={data?.totals[key]}
              previous={unavailable ? undefined : data?.previous[key]}
              compare={data?.period.compare}
              unavailable={unavailable}
              spark={series && data?.daily.map((d) => d[series])}
              loading={loading}
            />
          )
        })}
      </div>
    </div>
  )
}
