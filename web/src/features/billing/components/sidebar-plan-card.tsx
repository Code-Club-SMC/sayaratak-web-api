import { useQuery } from "@tanstack/react-query"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"
import { dashboardPath, localeHref } from "@/lib/navigation"
import { cn } from "@/lib/utils"
import type { User } from "@/schemas/user"
import { billingQueries } from "../queries"
import { PlanHeader } from "./plan-header"
import { PlanSummary } from "./plan-summary"

// The plan at the foot of the dashboard sidebar. In order: a plan picked in onboarding and not paid, a payment under review for a plan the account is not on yet, else the shared summary of the current plan (a renewal in review shows as a note in it). Hidden while the sidebar is collapsed; Billing is right above it.
export function SidebarPlanCard({ me }: { me: User }) {
  const { t, locale } = useT()
  const subscription = useQuery(billingQueries.subscription)
  const plans = useQuery(billingQueries.plans(me.role))
  const data = subscription.data
  if (!data || !plans.data) return null
  const base = dashboardPath(me.role)
  const current = data.plan ?? plans.data.find((p) => p.price === 0)
  const chosen = data.reviewPlan
    ? undefined
    : plans.data.find((p) => p.id === me.chosenPlanId)
  const waiting =
    data.reviewPlan && data.reviewPlan.id !== current?.id
      ? data.reviewPlan
      : undefined

  const link = (href: string, label: string, primary: boolean) => (
    <a
      href={localeHref(href, locale)}
      className={cn(
        buttonVariants({ variant: primary ? "default" : "outline" }),
        "w-full"
      )}
    >
      {label}
    </a>
  )
  const card =
    "mx-2 mb-6 flex flex-col gap-4 rounded-xl bg-card p-4 group-data-[collapsible=icon]:hidden"

  const pending = chosen ?? waiting
  if (pending)
    return (
      <div className={card}>
        <PlanHeader
          name={pending.name[locale]}
          size="sm"
          badge={
            chosen ? (
              <Badge variant="warning">{t("billing.sidebar_unpaid")}</Badge>
            ) : (
              <Badge variant="muted">{t("billing.pending_badge")}</Badge>
            )
          }
        />
        <p className="text-ui text-muted-foreground">
          {chosen
            ? t("billing.sidebar_unpaid_note", {
                free: current?.name[locale] ?? "",
              })
            : t("billing.sidebar_review_note")}
        </p>
        {chosen
          ? link(
              `${base}/billing/checkout?${new URLSearchParams({ item: `plan:${chosen.id}` })}`,
              t("billing.promos_pay_now"),
              true
            )
          : link(
              `${base}/billing?tab=history`,
              t("billing.sidebar_view_payment"),
              false
            )}
      </div>
    )

  return (
    // A plain block, not a region: the overview page has its own "Your plan" section.
    <div className={card}>
      <PlanSummary data={data} plan={current} audience={me.role} size="sm" />
      {link(
        `${base}/billing`,
        t(
          current?.price ? "billing.sidebar_manage" : "billing.sidebar_upgrade"
        ),
        !current?.price
      )}
    </div>
  )
}
