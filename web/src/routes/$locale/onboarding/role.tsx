import { createFileRoute, redirect } from "@tanstack/react-router"

import { requireUser } from "@/features/auth/guards"
import { draftQuery } from "@/features/auth/queries"
import { OnboardingLayout } from "@/features/onboarding/components/onboarding-layout"
import { RoleForm } from "@/features/onboarding/components/role-form"
import { roleDraftKey } from "@/features/onboarding/schemas"
import { getCopy } from "@/lib/i18n/server"
import { dashboardPath, localeHref } from "@/lib/navigation"
import { buildHead } from "@/lib/seo"

export const Route = createFileRoute("/$locale/onboarding/role")({
  // Signed in, onboarding not finished. A finished account goes to its dashboard.
  beforeLoad: (ctx) => {
    const me = requireUser(ctx)
    if (me.onboardingDone)
      throw redirect({
        href: localeHref(dashboardPath(me.role), ctx.context.locale),
      })
  },
  loader: async ({ context }) => {
    const [[title = "", description = ""]] = await Promise.all([
      getCopy({
        data: {
          locale: context.locale,
          keys: ["onboarding.role_title", "onboarding.role_description"],
        },
      }),
      context.queryClient.ensureQueryData(draftQuery(roleDraftKey)),
    ])
    return { title, description, locale: context.locale }
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildHead({ ...loaderData, path: "/onboarding/role", noindex: true })
      : {},
  component: () => (
    <OnboardingLayout>
      <RoleForm />
    </OnboardingLayout>
  ),
})
