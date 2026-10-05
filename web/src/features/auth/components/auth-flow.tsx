import { useReducer, useRef } from "react"

import { useEnterKeyHints } from "@/hooks/use-enter-key-hints"

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
  const root = useRef<HTMLDivElement>(null)
  useEnterKeyHints(root, state.step === "identifier" ? "next" : "done")
  return (
    <div ref={root} data-reserve-errors className="flex flex-col gap-6">
      <AuthHeader
        mode={mode}
        step={state.step}
        reason={mode === "dialog" ? reason : undefined}
        dispatch={dispatch}
      />
      <StepSwitch
        state={state}
        dispatch={dispatch}
        onDone={onDone}
        mode={mode}
      />
      <AuthFooter />
    </div>
  )
}
