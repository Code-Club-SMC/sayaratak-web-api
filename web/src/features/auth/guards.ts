import { redirect } from "@tanstack/react-router"

import { dashboardPath, localeHref, personalHref } from "@/lib/navigation"
import type { Locale } from "@/schemas/locale"
import type { User } from "@/schemas/user"

type Guard = {
  context: { me: User | null; locale: Locale }
  location: { href: string }
}

// Signed-out visitors go to the sign in page and come back to the page they asked for.
export function requireUser({ context, location }: Guard) {
  if (!context.me)
    throw redirect({
      href: personalHref(location.href, context.locale, null),
    })
  return context.me
}

// Another role goes to its own dashboard.
export const requireRole = (role: User["role"]) => (guard: Guard) => {
  const me = requireUser(guard)
  if (me.role !== role)
    throw redirect({
      href: localeHref(dashboardPath(me.role), guard.context.locale),
    })
}
