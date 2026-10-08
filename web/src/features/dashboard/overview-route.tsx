import { PageHeader } from "@/components/app/page-header"
import { getCopy } from "@/lib/i18n/server"
import { useT } from "@/lib/i18n/use-t"
import { buildHead } from "@/lib/seo"
import type { Locale } from "@/schemas/locale"
import { usePageTitle } from "./components/page-title"

function Overview() {
  const { t } = useT()
  usePageTitle(t("dashboard.nav_overview"))
  return <PageHeader title={t("dashboard.nav_overview")} />
}

// Loader and head of a dashboard page: its title (a message key) as the tab title, never indexed. Every dashboard route uses it.
export const dashboardPage = (path: string, titleKey: string) => ({
  loader: async ({ context }: { context: { locale: Locale } }) => {
    const [title = ""] = await getCopy({
      data: { locale: context.locale, keys: [titleKey] },
    })
    return { title, locale: context.locale }
  },
  head: ({ loaderData }: { loaderData?: { title: string; locale: Locale } }) =>
    loaderData ? buildHead({ ...loaderData, path, noindex: true }) : {},
})

// Route options shared by the five overview pages. Steps 9.1, 10.1, 11.1, 12.1 and 13.2 replace the component.
export const overviewRoute = (path: string) => ({
  ...dashboardPage(path, "dashboard.nav_overview"),
  component: Overview,
})
