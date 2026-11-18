import { useId } from "react"
import { Link } from "@tanstack/react-router"
import { MessageCircleIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { formatNumber, formatRelative } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { useNow } from "@/lib/now"
import type { RepliesReport } from "@sayaratak/shared/schemas/reports-replies"

// Threads waiting for the dealer's reply now, oldest first, each opening the conversation.
export function UnansweredCard({
  unanswered,
  loading,
}: {
  unanswered?: RepliesReport["unanswered"]
  loading?: boolean
}) {
  const { t, locale } = useT()
  const now = useNow()
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl bg-card p-5"
    >
      <h2 id={id} className="text-body font-semibold">
        {t("reports.unanswered_title")}
        {unanswered ? (
          <span className="ms-2 text-ui text-muted-foreground num">
            {formatNumber(unanswered.count, locale)}
          </span>
        ) : null}
      </h2>
      {loading || !unanswered ? (
        <Skeleton className="h-32" aria-hidden="true" />
      ) : unanswered.count === 0 ? (
        <EmptyState
          icon={MessageCircleIcon}
          title={t("reports.unanswered_empty")}
          level={3}
          className="py-4"
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {unanswered.items.map((item) => (
            <li
              key={item.threadId}
              className="flex items-center justify-between gap-3 py-3"
            >
              {/* r8 gives workshops and mechanics their own messages link. */}
              <Link
                to="/$locale/dealer/messages"
                params={{ locale }}
                search={{ thread: item.threadId }}
                className="min-w-0 truncate text-ui font-medium hover:text-primary"
              >
                <bdi>{item.subjectTitle[locale]}</bdi>
              </Link>
              <span className="shrink-0 text-caption text-muted-foreground">
                {t("reports.waiting_since", {
                  time: formatRelative(item.waitingSince, now, locale),
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
