import { createFileRoute, redirect } from "@tanstack/react-router"

import { stepHref } from "@/features/onboarding/draft"
import { loadOnboarding } from "@/features/onboarding/guards"

// "Finish setting up" lands here: resume at the first step still open.
export const Route = createFileRoute("/$locale/onboarding/")({
  beforeLoad: async (ctx) => {
    const { role, resume } = await loadOnboarding(ctx)
    throw redirect({ href: stepHref(role, resume, ctx.context.locale) })
  },
})
