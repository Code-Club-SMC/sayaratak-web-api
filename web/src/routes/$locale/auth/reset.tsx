import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"

import { AuthCardLayout } from "@/components/app/auth-card-layout"
import { ResetForm } from "@/features/auth/components/reset-form"
import { getCopy } from "@/lib/i18n/server"
import { buildHead } from "@/lib/seo"

export const Route = createFileRoute("/$locale/auth/reset")({
  validateSearch: z.object({ token: z.string().optional().catch(undefined) }),
  loader: async ({ context }) => {
    const [title = "", description = ""] = await getCopy({
      data: {
        locale: context.locale,
        keys: ["auth.reset_title", "auth.reset_description"],
      },
    })
    return { title, description, locale: context.locale }
  },
  head: ({ loaderData }) =>
    loaderData
      ? buildHead({ ...loaderData, path: "/auth/reset", noindex: true })
      : {},
  component: ResetPage,
})

function ResetPage() {
  const { token } = Route.useSearch()
  const { title, description } = Route.useLoaderData()
  return (
    <AuthCardLayout title={title} description={description}>
      <ResetForm token={token} />
    </AuthCardLayout>
  )
}
