import type { ReactNode } from "react"

import { FocusedTopBar } from "@/components/app/focused-top-bar"

// Basic version: top bar and one centered column. 5.9 adds the progress bar, preview and sticky footer.
export function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <FocusedTopBar />
      <main className="mx-auto flex w-full max-w-130 flex-col gap-8 px-4 pt-8 pb-12">
        {children}
      </main>
    </div>
  )
}
