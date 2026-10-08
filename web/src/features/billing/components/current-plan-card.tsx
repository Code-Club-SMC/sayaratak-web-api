import { useId } from "react"

import { PriceText } from "@/components/app/price-text"
import { UsageMeter } from "@/components/app/usage-meter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"
import { useNow } from "@/lib/now"
import type { Plan } from "@/schemas/billing"
import type { MeSubscription } from "@/schemas/responses"

const DAY_MS = 24 * 60 * 60 * 1000
const statusVariant = {
  active: "success",
  pending: "warning",
  expired: "destructive",
  canceled: "muted",
} as const

// The plan the account runs on: the subscription's plan, else the audience's free plan. The meter hides when the plan has no cap.
export function CurrentPlanCard({
  data,
  freePlan,
  audience,
  onHistory,
}: {
  data: MeSubscription
  freePlan?: Plan
  audience: Plan["audience"]
  onHistory: () => void
}) {
  const { t, locale } = useT()
  const now = useNow()
  const heading = useId()
  const { subscription, usage } = data
  const plan = data.plan ?? freePlan
  const days = subscription
    ? Math.ceil((Date.parse(subscription.endsAt) - now) / DAY_MS)
    : null
  return (
    <section
      aria-labelledby={heading}
      className="flex flex-col gap-4 rounded-xl bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={heading} className="text-ui text-muted-foreground">
            {t("billing.current_title")}
          </h2>
          <p className="flex flex-wrap items-center gap-2 text-title font-semibold">
            {plan?.name[locale]}
            {subscription && (
              <Badge variant={statusVariant[subscription.status]}>
                {t(`billing.status_${subscription.status}`)}
              </Badge>
            )}
          </p>
          <p className="text-ui text-muted-foreground">
            {days === null
              ? t("billing.no_end")
              : days <= 0
                ? t("billing.ends_today")
                : t("billing.ends_in", { count: days })}
          </p>
        </div>
        {plan && plan.price > 0 && (
          <PriceText price={subscription?.price ?? plan.price} size="table" />
        )}
      </div>
      {usage.limit !== null && (
        <UsageMeter
          label={t(
            audience === "dealership"
              ? "billing.usage_vehicles"
              : "billing.usage_listings"
          )}
          used={usage.used}
          limit={usage.limit}
        />
      )}
      <Button
        type="button"
        variant="link"
        className="self-start px-0"
        onClick={onHistory}
      >
        {t("billing.view_history")}
      </Button>
    </section>
  )
}
