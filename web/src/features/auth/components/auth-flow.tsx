import { useReducer } from "react"

import { authReducer, initialAuthState } from "../auth-flow-state"
import { useAuthGate } from "../auth-gate"
import { AuthFooter } from "./auth-footer"
import { AuthHeader } from "./auth-header"
import { StepSwitch } from "./step-switch"

// One flow for the dialog and the /auth page; only the wrapper differs. `onDone` runs once `me` is in the cache.
export function AuthFlow({
  mode,
  onDone,
}: {
  mode: "dialog" | "page"
  onDone: () => void
}) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState)
  const { reason } = useAuthGate()
  return (
    <div className="flex flex-col gap-6">
      <AuthHeader
        mode={mode}
        step={state.step}
        reason={mode === "dialog" ? reason : undefined}
        dispatch={dispatch}
      />
      <StepSwitch state={state} dispatch={dispatch} onDone={onDone} />
      <AuthFooter />
    </div>
  )
}
