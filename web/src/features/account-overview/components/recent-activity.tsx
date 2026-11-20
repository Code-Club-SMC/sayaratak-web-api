import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { buttonVariants } from "@/components/ui/button"
import { NotificationList } from "@/features/notifications/components/notification-list"
import { notificationQueries } from "@/features/notifications/queries"
import { useOpenNotification } from "@/features/notifications/use-open-notification"
import { useT } from "@/lib/i18n/use-t"
import { BellIcon } from "lucide-react"
import { EmptyState } from "@/components/app/empty-state"

// The five latest notifications. A click marks one read and opens its page.
export function RecentActivity() {
  const { t, locale } = useT()
  const list = useQuery(notificationQueries.list({ pageSize: 5 }))
  const open = useOpenNotification()
  return (
    <section
      aria-labelledby="overview-activity"
      className="flex flex-col gap-2 panel p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="overview-activity" className="text-body font-semibold">
          {t("dashboard.overview_activity_title")}
        </h2>
        <Link
          to="/$locale/account/notifications"
          params={{ locale }}
          className={buttonVariants({ variant: "ghost" })}
        >
          {t("notifications.see_all")}
        </Link>
      </div>
      <NotificationList
        items={list.data?.items}
        loading={list.isPending}
        error={list.isError && !list.data}
        onRetry={() => void list.refetch()}
        onOpen={open}
        empty={
          <EmptyState
            icon={BellIcon}
            title={t("notifications.empty_title")}
            body={t("notifications.empty_body")}
            level={3}
            className="py-6"
          />
        }
      />
    </section>
  )
}
