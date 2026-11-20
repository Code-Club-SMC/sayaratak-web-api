import { useQuery } from "@tanstack/react-query"
import { ActivityIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { SectionError } from "@/components/app/section-error"
import { Skeleton } from "@/components/ui/skeleton"
import { adminQueries } from "@/features/admin/queries"
import { formatDate, formatShortDate, formatTime } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { useNow } from "@/lib/now"
import { localeHref } from "@/lib/navigation"

// The ten newest events on the site; each row opens its admin screen with the item selected.
export function ActivityFeed() {
  const { t, locale } = useT()
  const activity = useQuery(adminQueries.activity)
  const items = activity.data?.items
  const now = useNow()
  // A log reads by the clock: today's events show their time, older ones their date.
  const today = formatDate(new Date(now).toISOString(), locale)
  const when = (iso: string) =>
    formatDate(iso, locale) === today
      ? formatTime(iso, locale)
      : formatShortDate(iso, locale)
  return (
    <section aria-labelledby="admin-activity" className="flex flex-col panel">
      <h2
        id="admin-activity"
        className="flex min-h-14 items-center justify-between gap-2 border-b px-5 py-3 text-body font-semibold"
      >
        {t("dashboard.overview_activity_title")}
        {items && (
          <span className="font-mono text-caption font-normal text-muted-foreground">
            {items.length}
          </span>
        )}
      </h2>
      <div className="p-3">
        {activity.isError ? (
          <SectionError
            message={t("admin.activity_error")}
            onRetry={() => void activity.refetch()}
          />
        ) : !items ? (
          <div aria-hidden="true" className="flex flex-col gap-3 py-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            level={3}
            icon={ActivityIcon}
            title={t("admin.activity_empty")}
            body={t("admin.activity_empty_body")}
            className="py-6"
          />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {items.map((item) => (
              <li key={`${item.type}-${item.id}`}>
                <a
                  href={localeHref(item.href, locale)}
                  className="grid grid-cols-[4.5rem_1fr] items-baseline gap-3 rounded-lg px-2 py-2.5 motion-color hover:bg-muted"
                >
                  <time
                    dateTime={item.createdAt}
                    className="font-mono text-caption text-muted-foreground"
                  >
                    {when(item.createdAt)}
                  </time>
                  <span className="text-ui">
                    {t(`admin.activity_${item.type}`, {
                      label: `⁨${item.label[locale]}⁩`,
                    })}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
