import { useQuery } from "@tanstack/react-query"
import { Link, type LinkProps } from "@tanstack/react-router"
import { BarChart3Icon } from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { buttonVariants } from "@/components/ui/button"
import { formatDayLong, khartoumHour } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { useNow } from "@/lib/now"
import { meQuery } from "@/features/auth/me-query"
import { usePageTitle } from "./page-title"

// Every overview counts a fixed last 30 days (step 11.7-r14); other periods, charts and tables live on the role's Reports page (Insights for the admin).
export function OverviewHeader({
  reports,
  label = "dashboard.see_reports",
}: {
  reports:
    | "/$locale/account/reports"
    | "/$locale/dealer/reports"
    | "/$locale/workshop/reports"
    | "/$locale/mechanic/reports"
    | "/$locale/admin/insights"
  label?: string
}) {
  const { t, locale } = useT()
  const now = useNow()
  const { data: me } = useQuery(meQuery)
  const title = t("dashboard.nav_overview")
  usePageTitle(title)
  // The page opens like a person would: "Good morning, Amna", by Khartoum time, with today's date under it.
  const hour = khartoumHour(now)
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"
  const name = me?.fullName.split(" ")[0]
  // Loose like StatCard's `link`: the Reports routes fill their own search defaults.
  const link: LinkProps = { to: reports, params: { locale } }
  return (
    <PageHeader
      title={name ? t(`dashboard.greeting_${part}`, { name }) : title}
      hint={t("dashboard.overview_hint", {
        date: formatDayLong(now, locale),
        range: t("dashboard.range_30d"),
      })}
    >
      <Link {...link} className={buttonVariants({ variant: "outline" })}>
        <BarChart3Icon aria-hidden="true" />
        {t(label)}
      </Link>
    </PageHeader>
  )
}
