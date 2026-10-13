import { useQuery } from "@tanstack/react-query"

import { UsageMeter } from "@/components/app/usage-meter"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"
import { dashboardPath, localeHref } from "@/lib/navigation"
import { useNow } from "@/lib/now"
import { cn } from "@/lib/utils"
import type { User } from "@/schemas/user"
import { billingQueries } from "../queries"

const DAY_MS = 24 * 60 * 60 * 1000

// The plan at the foot of the dashboard sidebar. In order: a plan payment under review, a plan picked in onboarding and not paid, else the current plan with its days and usage. Hidden while the sidebar is collapsed; Billing is right above it.
export function SidebarPlanCard({ me }: { me: User }) {
  const { t, locale } = useT()
  const now = useNow()
  const subscription = useQuery(billingQueries.subscription)
  const plans = useQuery(billingQueries.plans(me.role))
  const data = subscription.data
  if (!data || !plans.data) return null
  const base = dashboardPath(me.role)
  const free = plans.data.find((p) => p.price === 0)
  const current = data.plan ?? free
  const chosen = plans.data.find((p) => p.id === me.chosenPlanId)
  const days = data.subscription
    ? Math.ceil((Date.parse(data.subscription.endsAt) - now) / DAY_MS)
    : null

  const view = data.reviewPlan
    ? {
        name: data.reviewPlan.name[locale],
        badge: (
          <Badge variant="muted">{t("billing.promos_status_in_review")}</Badge>
        ),
        note: t("billing.sidebar_review_note"),
        href: `${base}/billing?tab=history`,
        action: t("billing.sidebar_view_payment"),
        primary: false,
      }
    : chosen
      ? {
          name: chosen.name[locale],
          badge: <Badge variant="warning">{t("billing.sidebar_unpaid")}</Badge>,
          note: t("billing.sidebar_unpaid_note", {
            free: current?.name[locale] ?? "",
          }),
          href: `${base}/billing/checkout?${new URLSearchParams({ item: `plan:${chosen.id}` })}`,
          action: t("billing.promos_pay_now"),
          primary: true,
        }
      : {
          name: current?.name[locale] ?? "",
          badge: null,
          note:
            days === null
              ? t("billing.no_end")
              : days <= 0
                ? t("billing.ends_today")
                : t("billing.ends_in", { count: days }),
          href: `${base}/billing`,
          action: t(
            current?.price
              ? "billing.sidebar_manage"
              : "billing.sidebar_upgrade"
          ),
          primary: !current?.price,
        }

  return (
    // A plain block, not a region: the overview page has its own "Your plan" section.
    <div className="mx-2 mb-2 flex flex-col gap-3 rounded-lg bg-card p-3 group-data-[collapsible=icon]:hidden">
      <div className="flex flex-col gap-1">
        <p className="text-caption text-muted-foreground">
          {t("billing.current_title")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-ui font-semibold">{view.name}</p>
          {view.badge}
        </div>
        <p className="text-caption text-muted-foreground">{view.note}</p>
      </div>
      {!data.reviewPlan && !chosen && (
        <UsageMeter
          label={t(
            me.role === "dealership"
              ? "billing.usage_vehicles"
              : "billing.usage_listings"
          )}
          used={data.usage.used}
          limit={data.usage.limit}
        />
      )}
      <a
        href={localeHref(view.href, locale)}
        className={cn(
          buttonVariants({
            variant: view.primary ? "default" : "outline",
            size: "sm",
          }),
          "w-full"
        )}
      >
        {view.action}
      </a>
    </div>
  )
}
