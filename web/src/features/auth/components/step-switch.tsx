import type { Dispatch, ReactNode } from "react"

import { useT } from "@/lib/i18n/use-t"
import type { AuthAction, AuthState, AuthStep } from "../auth-flow-state"
import { stepCopy } from "./auth-header"
import { IdentifierStep } from "./identifier-step"

export type StepProps = {
  state: AuthState
  dispatch: Dispatch<AuthAction>
  onDone: () => void
  // The dialog focuses its first field itself; autoFocus there would steal the focus-return target.
  mode: "dialog" | "page"
}

// Stands in until steps 5.3 to 5.5 build the real step.
function StepPlaceholder({ state }: StepProps) {
  const { t } = useT()
  return (
    <p className="text-ui text-muted-foreground">
      {t("auth.step_placeholder", { step: t(stepCopy[state.step].title) })}
    </p>
  )
}

const steps = {
  identifier: IdentifierStep,
  password: StepPlaceholder,
  create: StepPlaceholder,
  otp: StepPlaceholder,
} satisfies Record<AuthStep, (props: StepProps) => ReactNode>

export function StepSwitch(props: StepProps) {
  const Step = steps[props.state.step]
  return <Step {...props} />
}
