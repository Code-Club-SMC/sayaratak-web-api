import { Link, type LinkProps } from "@tanstack/react-router"
import { BarChart3Icon } from "lucide-react"

import { PageHeader } from "@/components/app/page-header"
import { buttonVariants } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"
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
  const title = t("dashboard.nav_overview")
  usePageTitle(title)
  // Loose like StatCard's `link`: the Reports routes fill their own search defaults.
  const link: LinkProps = { to: reports, params: { locale } }
  return (
    <PageHeader title={title} hint={t("dashboard.range_30d")}>
      <Link {...link} className={buttonVariants({ variant: "outline" })}>
        <BarChart3Icon aria-hidden="true" />
        {t(label)}
      </Link>
    </PageHeader>
  )
}
