import { Outlet, createFileRoute, notFound } from "@tanstack/react-router"

import { localeSchema } from "@/schemas/locale"

// Unknown locale segments are a 404. The `locale` cookie is set by the root loader (once per document).
export const Route = createFileRoute("/$locale")({
  beforeLoad: ({ params }) => {
    const locale = localeSchema.safeParse(params.locale)
    if (!locale.success) throw notFound()
    return { locale: locale.data }
  },
  component: Outlet,
})
