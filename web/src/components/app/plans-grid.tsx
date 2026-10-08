import { useId } from "react"

import type { Plan } from "@/schemas/billing"
import { PlanCard } from "./plan-card"

type Props = { plans: Plan[]; currentId?: string } & (
  | {
      mode: "select"
      label: string
      value?: string
      onChange: (id: string) => void
    }
  | {
      mode: "action"
      actionLabel: string
      onAction: (id: string) => void
      pendingIds?: string[]
    }
)

export function PlansGrid(props: Props) {
  const name = useId()
  return (
    <div
      role={props.mode === "select" ? "radiogroup" : undefined}
      aria-label={props.mode === "select" ? props.label : undefined}
      className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
    >
      {props.plans.map((plan) =>
        props.mode === "select" ? (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={plan.id === props.currentId}
            mode="select"
            name={name}
            selected={plan.id === props.value}
            onSelect={props.onChange}
          />
        ) : (
          <PlanCard
            key={plan.id}
            plan={plan}
            current={plan.id === props.currentId}
            mode="action"
            actionLabel={props.actionLabel}
            onAction={props.onAction}
            pending={props.pendingIds?.includes(plan.id)}
          />
        )
      )}
    </div>
  )
}
