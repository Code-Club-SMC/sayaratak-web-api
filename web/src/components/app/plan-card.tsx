import { CheckIcon } from "lucide-react"

import { formatPrice } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { Plan } from "@/schemas/billing"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type Props = { plan: Plan; current?: boolean } & (
  | {
      mode: "select"
      name: string
      selected: boolean
      onSelect: (id: string) => void
    }
  | {
      mode: "action"
      actionLabel: string
      onAction: (id: string) => void
      // A payment for this plan waits for review: a badge, and no second payment.
      pending?: boolean
    }
)

// "select" is a native radio (arrow keys and grouping for free) for onboarding. "action" is a button for the billing page; the free plan has nothing to buy, so it says "Included" instead.
export function PlanCard(props: Props) {
  const { plan, current } = props
  const { t, locale } = useT()
  const { amount, unit } = formatPrice(plan.price, locale)
  const limit =
    plan.listingLimit !== undefined
      ? t("billing.listing_limit", { count: plan.listingLimit })
      : plan.vehicleLimit !== undefined
        ? t("billing.vehicle_limit", { count: plan.vehicleLimit })
        : t("billing.unlimited")
  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-ui font-semibold">{plan.name[locale]}</h3>
        {current && (
          <Badge variant="primary">{t("billing.current_plan")}</Badge>
        )}
        {props.mode === "select" && plan.price === 0 && (
          <Badge>{t("billing.start_free")}</Badge>
        )}
        {props.mode === "action" && props.pending && (
          <Badge variant="warning">{t("billing.pending_badge")}</Badge>
        )}
      </div>
      <p className="flex flex-wrap items-baseline gap-x-1">
        <span className="text-title font-semibold num">{amount}</span>
        <span className="text-caption text-muted-foreground">{unit}</span>
        <span className="text-caption text-muted-foreground">
          / {t("billing.duration_days", { count: plan.durationDays })}
        </span>
      </p>
      <ul className="flex flex-col gap-1 text-ui">
        {[limit, ...plan.features.map((f) => f[locale])].map((text) => (
          <li key={text} className="flex items-start gap-2">
            <CheckIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            {text}
          </li>
        ))}
      </ul>
    </>
  )
  if (props.mode === "action")
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-card p-5">
        {body}
        {plan.price === 0 ? (
          <p className="mt-auto text-ui text-muted-foreground">
            {t("billing.included")}
          </p>
        ) : (
          <Button
            type="button"
            className="mt-auto"
            disabled={current || props.pending}
            onClick={() => props.onAction(plan.id)}
          >
            {props.actionLabel}
          </Button>
        )}
      </div>
    )
  return (
    <label className="flex cursor-pointer flex-col gap-3 rounded-xl bg-card p-5 has-checked:ring-2 has-checked:ring-primary has-focus-visible:ring-2 has-focus-visible:ring-ring">
      <input
        type="radio"
        name={props.name}
        value={plan.id}
        checked={props.selected}
        onChange={() => props.onSelect(plan.id)}
        className="size-4 accent-primary"
      />
      {body}
    </label>
  )
}
