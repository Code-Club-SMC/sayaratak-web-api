import { Outlet, createFileRoute, notFound } from "@tanstack/react-router"

import { redirectBanned } from "@/features/auth/guards"
import { localeSchema } from "@/schemas/locale"

// Unknown locale segments are a 404. The `locale` cookie is set by the root loader (once per document).
export const Route = createFileRoute("/$locale")({
  beforeLoad: ({ params, context, location }) => {
    const locale = localeSchema.safeParse(params.locale)
    if (!locale.success) throw notFound()
    redirectBanned({
      me: context.me,
      locale: locale.data,
      pathname: location.pathname,
    })
    return { locale: locale.data }
  },
  component: Outlet,
})
