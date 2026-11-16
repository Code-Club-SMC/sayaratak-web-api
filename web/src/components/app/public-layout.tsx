import { Outlet, useMatches } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

import { useT } from "@/lib/i18n/use-t"
import { siteQuery } from "@/features/pages/queries"
import { Footer } from "./footer"
import { Header } from "./header"
import { MobileTabBar } from "./mobile-tab-bar"
import { SeedNotice } from "./seed-notice"

export function PublicLayout() {
  const { t } = useT()
  const site = useQuery(siteQuery)
  const matches = useMatches()
  const containsPreview = matches.some((m) =>
    Boolean(
      (m.loaderData as { containsPreview?: boolean } | undefined)
        ?.containsPreview
    )
  )
  const isDemoActive = Boolean(site.data?.demoActive || containsPreview)

  return (
    <div className="flex min-h-dvh flex-col pb-[calc(56px+env(safe-area-inset-bottom))] has-[[data-mobile-contact-bar]]:pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-0 md:has-[[data-mobile-contact-bar]]:pb-[calc(80px+env(safe-area-inset-bottom))] lg:has-[[data-mobile-contact-bar]]:pb-0">
      <a
        href="#main-content"
        className="sr-only z-(--z-dialog) rounded-lg bg-primary px-4 py-3 text-ui font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-2"
        onClick={() => document.getElementById("main-content")?.focus()}
      >
        {t("nav.skip_to_content")}
      </a>
      <Header />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1200px] flex-1 px-4 md:px-6"
      >
        <SeedNotice active={isDemoActive} />
        <Outlet />
      </main>
      <Footer />
      <MobileTabBar />
    </div>
  )
}
