import { useQuery } from "@tanstack/react-query"
import { Bell } from "lucide-react"

import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { dashboardPath, personalHref } from "@/lib/navigation"
import { meQuery } from "@/features/auth/me-query"
import { countsQuery } from "@/features/notifications/counts-query"

// Step 8.4 adds the notification popover and read actions.
export function NotificationBell() {
  const { t, locale } = useT()
  const { data: me = null } = useQuery(meQuery)
  const { data: counts } = useQuery({ ...countsQuery, enabled: !!me })
  const count = me ? counts?.unreadNotifications : undefined
  return (
    <a
      href={personalHref(
        `${dashboardPath(me?.role)}/notifications`,
        locale,
        me
      )}
      aria-label={
        count
          ? t("nav.notifications_unread", { count })
          : t("nav.notifications")
      }
      className="relative inline-flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted md:size-10"
    >
      <Bell className="size-5" strokeWidth={1.5} aria-hidden="true" />
      {!!count && (
        <span
          aria-hidden="true"
          className="absolute end-0 top-0 min-w-4 rounded-full bg-accent px-1 text-center text-caption text-accent-foreground num"
        >
          {formatNumber(count, locale)}
        </span>
      )}
    </a>
  )
}
