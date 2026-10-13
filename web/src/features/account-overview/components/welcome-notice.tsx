import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { XIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { billingQueries } from "@/features/billing/queries"
import { formatPrice } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { dashboardPath, localeHref } from "@/lib/navigation"
import type { User } from "@/schemas/user"

type Role = Exclude<User["role"], "admin">

// Where the first step goes when no paid plan waits.
const firstStep: Record<Role, { href: string; key: string }> = {
  user: { href: "/post", key: "dashboard.overview_welcome_cta" },
  dealership: {
    href: "/dealer/inventory/new",
    key: "dashboard.welcome_cta_dealership",
  },
  workshop: {
    href: "/workshop/verification",
    key: "dashboard.welcome_cta_verify",
  },
  mechanic: {
    href: "/mechanic/verification",
    key: "dashboard.welcome_cta_verify",
  },
}

// Shown once after onboarding (`?welcome=1`). A paid plan picked in onboarding (`&plan=<id>`) turns the first step into its checkout. Closing it drops both params from the URL.
export function WelcomeNotice({
  role = "user",
  planId,
}: {
  role?: Role
  planId?: string
}) {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const plans = useQuery({
    ...billingQueries.plans(role),
    enabled: Boolean(planId),
  })
  if (planId && plans.isPending) return null
  const plan = plans.data?.find((p) => p.id === planId && p.price > 0)
  const free = plans.data?.find((p) => p.price === 0)
  const close = () =>
    void navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        welcome: undefined,
        plan: undefined,
      }),
      replace: true,
      resetScroll: false,
    })
  const step = firstStep[role]
  const href = plan
    ? `${dashboardPath(role)}/billing/checkout?${new URLSearchParams({ item: `plan:${plan.id}` })}`
    : step.href
  const price = plan && formatPrice(plan.price, locale)
  return (
    <section
      aria-labelledby="welcome-title"
      className="flex items-start gap-3 rounded-xl bg-accent p-4 text-accent-foreground sm:p-6"
    >
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
        <h2 id="welcome-title" className="text-title font-semibold">
          {t("dashboard.welcome_title")}
        </h2>
        <p className="text-body">
          {role === "user"
            ? t("dashboard.overview_welcome")
            : t(`dashboard.welcome_ready_${role}`)}
        </p>
        {plan && price && (
          <p className="text-body">
            {t("dashboard.welcome_plan", {
              plan: plan.name[locale],
              price: `${price.amount} ${price.unit}`,
              days: plan.durationDays,
              free: free?.name[locale] ?? "",
            })}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <a href={localeHref(href, locale)} className={buttonVariants()}>
            {plan
              ? t("dashboard.welcome_pay", { plan: plan.name[locale] })
              : t(step.key)}
          </a>
          {plan && (
            <Button type="button" variant="ghost" onClick={close}>
              {t("dashboard.welcome_later")}
            </Button>
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("common.close")}
        onClick={close}
      >
        <XIcon aria-hidden="true" />
      </Button>
    </section>
  )
}
