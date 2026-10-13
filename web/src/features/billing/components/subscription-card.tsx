import { useId } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { SectionError } from "@/components/app/section-error"
import { UsageMeter } from "@/components/app/usage-meter"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { billingQueries } from "@/features/billing/queries"
import { useT } from "@/lib/i18n/use-t"
import { useNow } from "@/lib/now"
import { cn } from "@/lib/utils"

const DAY_MS = 24 * 60 * 60 * 1000
const billing = {
  dealership: "/$locale/dealer/billing",
  workshop: "/$locale/workshop/billing",
  mechanic: "/$locale/mechanic/billing",
} as const

// The plan, days left, the vehicle (or listing) meter and the way to billing. With no subscription it names the free plan of the role. The dealer, workshop and mechanic overviews show it.
export function SubscriptionCard({
  role,
}: {
  role: "dealership" | "workshop" | "mechanic"
}) {
  const { t, locale } = useT()
  const now = useNow()
  const id = useId()
  const subscription = useQuery(billingQueries.subscription)
  const plans = useQuery(billingQueries.plans(role))
  const data = subscription.data
  const plan = data?.plan ?? plans.data?.find((p) => p.price === 0)
  const days = data?.subscription
    ? Math.ceil((Date.parse(data.subscription.endsAt) - now) / DAY_MS)
    : null
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl bg-card p-5"
    >
      <h2 id={id} className="text-body font-semibold">
        {t("billing.current_title")}
      </h2>
      {subscription.isError ? (
        <SectionError
          message={t("billing.plans_error")}
          onRetry={() => void subscription.refetch()}
        />
      ) : !data ? (
        <Skeleton className="h-28" aria-hidden="true" />
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <p className="text-title font-semibold">{plan?.name[locale]}</p>
            <p className="text-ui text-muted-foreground">
              {days === null
                ? t("billing.no_end")
                : days <= 0
                  ? t("billing.ends_today")
                  : t("billing.ends_in", { count: days })}
            </p>
          </div>
          <UsageMeter
            label={t(
              role === "dealership"
                ? "billing.usage_vehicles"
                : "billing.usage_listings"
            )}
            used={data.usage.used}
            limit={data.usage.limit}
          />
          <Link
            to={billing[role]}
            params={{ locale }}
            // `cn` drops the base `border-transparent`, which would otherwise hide the outline border on a link.
            className={cn(buttonVariants({ variant: "outline" }), "self-start")}
          >
            {t("dashboard.dealer_change_plan")}
          </Link>
        </>
      )}
    </section>
  )
}
