import type { Dispatch, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"
import { useLogin } from "../queries"
import type { AuthAction, AuthState, AuthStep } from "../auth-flow-state"
import { stepCopy } from "./auth-header"

export type StepProps = {
  state: AuthState
  dispatch: Dispatch<AuthAction>
  onDone: () => void
}

// Stands in until steps 5.2 to 5.5 build the real step. The identifier one keeps a demo sign in so gated buttons stay usable.
function StepPlaceholder({ state, onDone }: StepProps) {
  const { t } = useT()
  const login = useLogin()
  return (
    <div className="flex flex-col gap-3">
      <p className="text-ui text-muted-foreground">
        {t("auth.step_placeholder", { step: t(stepCopy[state.step].title) })}
      </p>
      {state.step === "identifier" && (
        <Button
          disabled={login.isPending}
          onClick={() =>
            login.mutate(
              { identifier: "+249912345601", password: "Demo1234" },
              { onSuccess: onDone }
            )
          }
        >
          {t("auth.demo_user")}
        </Button>
      )}
    </div>
  )
}

const steps = {
  identifier: StepPlaceholder,
  password: StepPlaceholder,
  create: StepPlaceholder,
  otp: StepPlaceholder,
} satisfies Record<AuthStep, (props: StepProps) => ReactNode>

export function StepSwitch(props: StepProps) {
  const Step = steps[props.state.step]
  return <Step {...props} />
}
