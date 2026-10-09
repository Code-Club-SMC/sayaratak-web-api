import type { ReactNode } from "react"

import { useT } from "@/lib/i18n/use-t"
import { usePrefs } from "@/lib/prefs"
import { BrandLogo } from "./brand-logo"
import { LanguageSwitcher } from "./language-switcher"

export type AuthPanel = "login" | "signup" | "reset"

// Sign in, sign up, password reset and the first onboarding pages: the form on the page background (so fields are white), and from lg a white side panel with a headline and a photo that runs off its end and bottom edges. The panel is `display: none` below lg, so its lazy photo never loads on a phone.
export function AuthShell({
  panel,
  action,
  children,
}: {
  panel: AuthPanel
  // Sits next to the language switch, e.g. onboarding's Save and exit.
  action?: ReactNode
  children: ReactNode
}) {
  const { t } = useT()
  const { dataSaver } = usePrefs()
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 md:px-6">
        <header className="flex h-16 items-center justify-between gap-3">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            {action}
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 pt-8 pb-12 lg:justify-center">
          {children}
        </main>
      </div>
      <aside
        aria-hidden="true"
        className="sticky top-0 hidden h-dvh flex-col gap-4 overflow-hidden bg-card ps-12 pt-24 lg:flex"
      >
        <p className="max-w-lg pe-12 text-hero font-semibold">
          {t(`auth.panel_${panel}_title`)}
        </p>
        <p className="max-w-lg pe-12 text-lead text-muted-foreground">
          {t(`auth.panel_${panel}_text`)}
        </p>
        {!dataSaver && (
          <img
            src={`/images/auth/${panel}.webp`}
            alt=""
            loading="lazy"
            decoding="async"
            className="mt-8 min-h-0 w-full flex-1 rounded-ss-2xl object-cover"
          />
        )}
      </aside>
    </div>
  )
}
