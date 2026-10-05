import { dashboardPath, localeHref } from "@/lib/navigation"
import type { Locale } from "@/schemas/locale"
import type { User } from "@/schemas/user"

// Where a page-mode sign in lands: the `redirect` target, else the role dashboard, else role selection for a new account.
export function signInDestination(
  me: User,
  redirect: string | undefined,
  locale: Locale
) {
  if (redirect) return localeHref(redirect, locale)
  return localeHref(
    me.onboardingDone ? dashboardPath(me.role) : "/onboarding/role",
    locale
  )
}
