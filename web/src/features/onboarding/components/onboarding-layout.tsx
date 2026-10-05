import type { ReactNode } from "react"

import { FocusedTopBar } from "@/components/app/focused-top-bar"
import { StepIndicator } from "@/components/app/step-indicator"
import { useT } from "@/lib/i18n/use-t"
import { cn } from "@/lib/utils"

// Role page: one column. Step pages add `progress` and `onExit`; business flows add `preview`, a 360 column beside the 520 form from lg.
export function OnboardingLayout({
  children,
  progress,
  preview,
  onExit,
}: {
  children: ReactNode
  progress?: { current: number; total: number }
  preview?: ReactNode
  onExit?: () => void
}) {
  const { t } = useT()
  return (
    <div className={cn("min-h-dvh", progress && "pb-24")}>
      <FocusedTopBar
        action={onExit && { label: t("onboarding.save_exit"), onClick: onExit }}
      />
      <div
        className={cn(
          "mx-auto w-full px-4",
          preview ? "max-w-244" : "max-w-138"
        )}
      >
        {progress && (
          <div className="max-w-130 pt-4">
            <StepIndicator {...progress} labelFromMd />
          </div>
        )}
        <div
          className={cn(
            preview && "lg:grid lg:grid-cols-[520px_360px] lg:gap-x-16"
          )}
        >
          <main className="flex max-w-130 flex-col gap-8 pt-8 pb-12">
            {children}
          </main>
          {preview && (
            <aside className="sticky top-8 hidden w-90 self-start pt-8 lg:block">
              {preview}
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
