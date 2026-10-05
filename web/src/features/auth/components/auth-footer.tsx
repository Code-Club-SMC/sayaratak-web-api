import { ShellLink } from "@/components/app/shell-link"
import { useT } from "@/lib/i18n/use-t"

const linkClass =
  "inline-flex min-h-11 items-center text-caption underline md:min-h-10"

export function AuthFooter() {
  const { t } = useT()
  return (
    <nav
      aria-label={t("auth.legal")}
      className="flex flex-wrap gap-x-4 text-muted-foreground"
    >
      <ShellLink path="/terms" className={linkClass} newTab>
        {t("nav.terms")}
      </ShellLink>
      <ShellLink path="/privacy" className={linkClass} newTab>
        {t("nav.privacy")}
      </ShellLink>
    </nav>
  )
}
