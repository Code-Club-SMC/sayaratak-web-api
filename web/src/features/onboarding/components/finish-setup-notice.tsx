import { useQuery } from "@tanstack/react-query"

import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import { meQuery } from "@/features/auth/me-query"

// Public header strip for a signed-in account that has not finished onboarding. /onboarding resumes at the first open step.
export function FinishSetupNotice() {
  const { t, locale } = useT()
  const { data: me } = useQuery(meQuery)
  if (!me || me.onboardingDone) return null
  return (
    <div className="bg-muted">
      <div className="mx-auto flex min-h-11 max-w-[1200px] items-center justify-between gap-3 px-4 md:px-6">
        <p className="text-ui">{t("nav.finish_setup")}</p>
        <a
          href={localeHref("/onboarding", locale)}
          className="inline-flex min-h-11 shrink-0 items-center text-ui font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("common.continue")}
        </a>
      </div>
    </div>
  )
}
