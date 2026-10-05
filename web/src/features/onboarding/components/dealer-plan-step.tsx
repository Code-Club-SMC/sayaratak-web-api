import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Controller, useFormContext } from "react-hook-form"

import { FieldError } from "@/components/app/field-error"
import { PlansGrid } from "@/components/app/plans-grid"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { billingQueries } from "@/features/billing/queries"
import { useT } from "@/lib/i18n/use-t"
import { useDelayed } from "@/lib/use-delayed"
import type { PlanStep } from "../schemas"

export function DealerPlanStep() {
  const { t } = useT()
  const { control, getValues, setValue } = useFormContext<PlanStep>()
  const plans = useQuery(billingQueries.plans("dealership"))
  const waiting = useDelayed(plans.isPending)
  const free = plans.data?.find((p) => p.price === 0)
  // The free plan is the default, so finishing takes no choice.
  useEffect(() => {
    if (free && !getValues("planId")) setValue("planId", free.id)
  }, [free, getValues, setValue])
  if (plans.isError)
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p className="text-ui text-destructive">
          {t("onboarding.plans_error")}
        </p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => plans.refetch()}
        >
          {t("common.retry")}
        </Button>
      </div>
    )
  if (!plans.data)
    return waiting ? <Skeleton className="h-64 w-full rounded-xl" /> : null
  return (
    <>
      <Controller
        control={control}
        name="planId"
        render={({ field, fieldState }) => (
          <>
            <PlansGrid
              mode="select"
              plans={plans.data}
              label={t("onboarding.plans_label")}
              value={field.value}
              onChange={field.onChange}
            />
            <FieldError message={fieldState.error?.message} />
          </>
        )}
      />
      <p className="text-caption text-muted-foreground">
        {t("onboarding.plan_note")}
      </p>
    </>
  )
}
