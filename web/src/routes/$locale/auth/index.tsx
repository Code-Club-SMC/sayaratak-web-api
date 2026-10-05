import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { AuthCardLayout } from "@/components/app/auth-card-layout"
import { AuthFlow } from "@/features/auth/components/auth-flow"
import { signInDestination } from "@/features/auth/destination"
import { useAuthDone } from "@/features/auth/use-auth-done"
import { getCopy } from "@/lib/i18n/server"
import { safeRedirect } from "@/lib/navigation"
import { buildHead } from "@/lib/seo"

const searchSchema = z.object({
  redirect: z.string().optional().transform(safeRedirect).catch(undefined),
})

export const Route = createFileRoute("/$locale/auth/")({
  validateSearch: searchSchema,
  // A signed-in visitor has nothing to do here.
  beforeLoad: ({ context, search }) => {
    if (context.me)
      throw redirect({
        href: signInDestination(context.me, search.redirect, context.locale),
      })
  },
  loader: async ({ context }) => {
    const [title = "", description = ""] = await getCopy({
      data: {
        locale: context.locale,
        keys: ["auth.title", "auth.page_description"],
      },
    })
    return { title, description, locale: context.locale }
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildHead({ ...loaderData, path: "/auth", noindex: true })
      : {},
  component: AuthPage,
})

function AuthPage() {
  const search = Route.useSearch()
  return (
    <AuthCardLayout>
      <AuthFlow mode="page" onDone={useAuthDone(search.redirect)} />
    </AuthCardLayout>
  )
}
