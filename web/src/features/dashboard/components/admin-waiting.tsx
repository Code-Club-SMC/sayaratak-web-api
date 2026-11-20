import { useQuery } from "@tanstack/react-query"
import { Link, type LinkProps } from "@tanstack/react-router"

import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { countsQuery } from "@/features/notifications/counts-query"

// The admin's morning check in the top bar: listings to review, open reports and payments to approve, each opening its queue. Same counts as the sidebar badges.
export function AdminWaiting() {
  const { t, locale } = useT()
  const { data } = useQuery(countsQuery)
  if (!data) return null
  const params = { locale }
  const rows: { count?: number; label: string; link: LinkProps }[] = [
    {
      count: data.pendingListings,
      label: t("dashboard.waiting_review"),
      link: { to: "/$locale/admin/moderation", params },
    },
    {
      count: data.openReports,
      label: t("dashboard.waiting_reports"),
      link: { to: "/$locale/admin/reports", params },
    },
    {
      count: data.pendingPayments,
      label: t("dashboard.waiting_payments"),
      link: { to: "/$locale/admin/payments", params },
    },
  ]
  return (
    <nav
      aria-label={t("dashboard.waiting_label")}
      className="hidden items-center gap-0.5 rounded-full bg-muted p-0.5 xl:flex"
    >
      {rows.map((row) => (
        <Link
          key={row.label}
          {...row.link}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption whitespace-nowrap text-muted-foreground motion-color hover:bg-card hover:text-foreground"
        >
          <span
            className={`font-semibold num ${row.count ? "text-warning" : ""}`}
          >
            {formatNumber(row.count ?? 0, locale)}
          </span>
          {row.label}
        </Link>
      ))}
    </nav>
  )
}
