import type { Dispatch } from "react"
import { ChevronLeftIcon } from "lucide-react"

import { StepHeader } from "@/components/app/step-header"
import { Button } from "@/components/ui/button"
import { DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useFocusOnChange } from "@/hooks/use-focus-on-change"
import { useT } from "@/lib/i18n/use-t"
import type { AuthAction, AuthStep } from "../auth-flow-state"

export const stepCopy = {
  identifier: { title: "auth.title", helper: "auth.helper_identifier" },
  password: { title: "auth.title_password", helper: "auth.helper_password" },
  create: { title: "auth.title_create", helper: "auth.helper_create" },
  otp: { title: "auth.title_otp", helper: "auth.helper_otp" },
} as const satisfies Record<AuthStep, { title: string; helper: string }>

// Title and one line of help for the current step. On the identifier step a gated action's `reason` replaces the help.
export function AuthHeader({
  mode,
  step,
  reason,
  dispatch,
}: {
  mode: "dialog" | "page"
  step: AuthStep
  reason?: string
  dispatch: Dispatch<AuthAction>
}) {
  const { t } = useT()
  const heading = useFocusOnChange<HTMLHeadingElement>(step)
  const copy = stepCopy[step]
  const title = t(copy.title)
  const helper = step === "identifier" && reason ? t(reason) : t(copy.helper)
  // Icon only and inside the title row, so the title stays put when Back appears.
  const back = step !== "identifier" && (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={t("common.back")}
      className="-my-1 -ms-2 shrink-0"
      onClick={() => dispatch({ type: "back" })}
    >
      <ChevronLeftIcon className="rtl:-scale-x-100" />
    </Button>
  )
  return (
    <div className="flex flex-col gap-3">
      {mode === "page" ? (
        <StepHeader title={title} helper={helper} step={step} leading={back} />
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-start gap-1">
            {back}
            <DialogTitle
              ref={heading}
              tabIndex={-1}
              // Token values, not the text-title role: DialogTitle sets text-base, which would win over a role class.
              className="text-[length:var(--text-title)] leading-[var(--leading-title)] font-semibold focus-visible:outline-none"
            >
              {title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-[length:var(--text-ui)] leading-[var(--leading-ui)]">
            {helper}
          </DialogDescription>
        </div>
      )}
    </div>
  )
}
