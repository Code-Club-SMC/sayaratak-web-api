import { createFileRoute, redirect } from "@tanstack/react-router"

import { AuthCardLayout } from "@/components/app/auth-card-layout"
import { ForgotForm } from "@/features/auth/components/forgot-form"
import { signInDestination } from "@/features/auth/destination"
import { getCopy } from "@/lib/i18n/server"
import { buildHead } from "@/lib/seo"

export const Route = createFileRoute("/$locale/auth/forgot")({
  beforeLoad: ({ context }) => {
    if (context.me)
      throw redirect({
        href: signInDestination(context.me, undefined, context.locale),
      })
  },
  loader: async ({ context }) => {
    const [title = "", description = ""] = await getCopy({
      data: {
        locale: context.locale,
        keys: ["auth.forgot_title", "auth.forgot_description"],
      },
    })
    return { title, description, locale: context.locale }
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildHead({ ...loaderData, path: "/auth/forgot", noindex: true })
      : {},
  component: ForgotPage,
})

function ForgotPage() {
  const { title, description } = Route.useLoaderData()
  return (
    <AuthCardLayout title={title} description={description}>
      <ForgotForm />
    </AuthCardLayout>
  )
}
