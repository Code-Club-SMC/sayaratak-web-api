import { redirect } from "@tanstack/react-router"
import type { QueryClient } from "@tanstack/react-query"

import { requireUser } from "@/features/auth/guards"
import { draftQuery } from "@/features/auth/queries"
import { dashboardPath, localeHref } from "@/lib/navigation"
import type { Locale } from "@/schemas/locale"
import type { User } from "@/schemas/user"
import { reachableIndex } from "./draft"
import { flows } from "./flows"
import { onboardingDraftKey, roleChoiceSchema, roleDraftKey } from "./schemas"

// Shared by both onboarding routes: signed in, not finished, a role chosen. Answers with the furthest step that role's draft lets the person open (`resume` is its id).
export async function loadOnboarding(ctx: {
  context: { me: User | null; locale: Locale; queryClient: QueryClient }
  location: { href: string }
}) {
  const me = requireUser(ctx)
  const { locale, queryClient } = ctx.context
  if (me.onboardingDone)
    throw redirect({ href: localeHref(dashboardPath(me.role), locale) })
  const picked = roleChoiceSchema.safeParse(
    (await queryClient.ensureQueryData(draftQuery(roleDraftKey))).data
  )
  if (!picked.success)
    throw redirect({ href: localeHref("/onboarding/role", locale) })
  const { role } = picked.data
  const steps = flows[role]
  const { data } = await queryClient.ensureQueryData(
    draftQuery(onboardingDraftKey(role))
  )
  const reach = reachableIndex(steps, data)
  return { role, steps, reach, resume: steps[reach]?.id ?? "" }
}
