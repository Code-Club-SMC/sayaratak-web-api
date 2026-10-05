import type { ReactNode } from "react"

import { BrandLogo } from "./brand-logo"
import { LanguageSwitcher } from "./language-switcher"

// Centered column for the pages outside the public shell (forgot and reset password).
export function AuthCardLayout({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <BrandLogo />
        <LanguageSwitcher />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-page font-semibold">{title}</h1>
        {description && (
          <p className="text-ui text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-4 rounded-xl bg-card p-6">
        {children}
      </div>
    </main>
  )
}
