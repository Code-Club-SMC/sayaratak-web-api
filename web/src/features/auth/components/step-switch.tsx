import type { Dispatch, ReactNode } from "react"

import type { AuthAction, AuthState, AuthStep } from "../auth-flow-state"
import { CreateAccountStep } from "./create-account-step"
import { IdentifierStep } from "./identifier-step"
import { OtpStep } from "./otp-step"
import { PasswordStep } from "./password-step"

export type StepProps = {
  state: AuthState
  dispatch: Dispatch<AuthAction>
  onDone: () => void
  // The dialog focuses its first field itself; autoFocus there would steal the focus-return target.
  mode: "dialog" | "page"
}

const steps = {
  identifier: IdentifierStep,
  password: PasswordStep,
  create: CreateAccountStep,
  otp: OtpStep,
} satisfies Record<AuthStep, (props: StepProps) => ReactNode>

export function StepSwitch(props: StepProps) {
  const Step = steps[props.state.step]
  return (
    <div
      key={props.state.step}
      className="transition-opacity duration-(--dur-fast) ease-(--ease-standard) starting:opacity-0"
    >
      <Step {...props} />
    </div>
  )
}
