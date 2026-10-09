import { Link, useNavigate } from "@tanstack/react-router"
import { XIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { useT } from "@/lib/i18n/use-t"

// Shown once after onboarding (`?welcome=1`). Closing it drops the param from the URL.
export function WelcomeNotice() {
  const { t, locale } = useT()
  const navigate = useNavigate()
  return (
    <section className="flex items-start gap-3 rounded-xl bg-accent p-4 text-accent-foreground">
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
        <p className="text-ui">{t("dashboard.overview_welcome")}</p>
        <Link
          to="/$locale/post"
          params={{ locale }}
          className={buttonVariants()}
        >
          {t("dashboard.overview_welcome_cta")}
        </Link>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("common.close")}
        onClick={() =>
          void navigate({
            to: ".",
            search: {},
            replace: true,
            resetScroll: false,
          })
        }
      >
        <XIcon aria-hidden="true" />
      </Button>
    </section>
  )
}
