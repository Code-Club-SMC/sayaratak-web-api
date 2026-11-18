import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { useT } from "@/lib/i18n/use-t"
import { dashboardPath, localeHref } from "@/lib/navigation"
import { useNow } from "@/lib/now"
import type { User } from "@sayaratak/shared/schemas/user"
import { billingQueries } from "../queries"

const DAY_MS = 24 * 60 * 60 * 1000

// One line above the user card: the plan name and its state, linking to where it is acted on (checkout for an unpaid pick, the payment for an upgrade in review, else billing). Hidden while the sidebar is collapsed; Billing is in the nav. The full summary with usage lives on the overview and billing pages.
export function SidebarPlanCard({ me }: { me: User }) {
  const { t, locale } = useT()
  const now = useNow()
  const subscription = useQuery(billingQueries.subscription)
  const plans = useQuery(billingQueries.plans(me.role))
  const data = subscription.data
  if (!data || !plans.data) return null
  const base = dashboardPath(me.role)
  const current = data.plan ?? plans.data.find((p) => p.price === 0)
  const chosen = data.reviewPlan
    ? undefined
    : plans.data.find((p) => p.id === me.chosenPlanId)
  const upgrading = !!data.reviewPlan && data.reviewPlan.id !== current?.id
  const sub = data.subscription
  const days = sub
    ? Math.round((Date.parse(sub.endsAt) - now) / DAY_MS)
    : undefined

  const [name, state, href, action] = chosen
    ? [
        chosen.name[locale],
        <Badge variant="warning">{t("billing.sidebar_unpaid")}</Badge>,
        `${base}/billing/checkout?${new URLSearchParams({ item: `plan:${chosen.id}` })}`,
        t("billing.promos_pay_now"),
      ]
    : upgrading
      ? [
          current?.name[locale],
          <Badge variant="warning">
            {t("billing.payment_status_pending_review")}
          </Badge>,
          `${base}/billing?tab=history`,
          t("billing.sidebar_view_payment"),
        ]
      : sub && sub.status !== "active"
        ? [
            current?.name[locale],
            <Badge variant={sub.status === "pending" ? "warning" : "muted"}>
              {t(`billing.status_${sub.status}`)}
            </Badge>,
            `${base}/billing`,
            t("billing.sidebar_manage"),
          ]
        : current?.price && days !== undefined
          ? [
              current.name[locale],
              <span className="text-caption text-muted-foreground">
                {days <= 0
                  ? t("billing.ends_today")
                  : t("billing.ends_in", { count: days })}
              </span>,
              `${base}/billing`,
              t("billing.sidebar_manage"),
            ]
          : [
              current?.name[locale],
              <span className="text-caption font-medium text-primary">
                {t("billing.sidebar_upgrade")}
              </span>,
              `${base}/billing`,
              undefined,
            ]

  return (
    <a
      href={localeHref(href, locale)}
      className="mx-2 mb-2 flex h-10 items-center gap-2 rounded-lg bg-card px-3 transition-colors duration-(--dur-fast) ease-(--ease-standard) group-data-[collapsible=icon]:hidden hover:bg-sidebar-accent"
    >
      <span className="min-w-0 flex-1 truncate text-ui font-medium">
        {name}
      </span>
      <span className="shrink-0">{state}</span>
      {action && <span className="sr-only">, {action}</span>}
    </a>
  )
}
