import { useLocation } from "@tanstack/react-router"
import { ChevronRightIcon } from "lucide-react"

import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import type { User } from "@sayaratak/shared/schemas/user"
import { LanguageSwitcher } from "@/components/app/language-switcher"
import { NotificationBell } from "@/components/app/notification-bell"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { CommandMenu } from "./command-menu"
import { useTopbarTitle } from "./page-title"
import { isActive, navConfig, navHref } from "../nav-config"

export function DashboardTopbar({ role }: { role: User["role"] }) {
  const { t, locale } = useT()
  const title = useTopbarTitle()
  const pathname = useLocation({ select: (l) => l.pathname })
  // The section of the open page leads the title, so the bar reads "Marketplace > Mechanics".
  const section = navConfig[role].find((g) =>
    g.items.some((item) =>
      isActive(
        pathname,
        localeHref(navHref(role, item.path), locale),
        !item.path
      )
    )
  )?.key
  return (
    <header className="sticky top-0 z-(--z-sticky) flex h-14 shrink-0 items-center gap-2 border-b bg-card px-4 [view-transition-name:dashboard-topbar] md:px-6 lg:rounded-t-lg">
      <SidebarTrigger aria-label={t("dashboard.toggle_menu")} />
      <p className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-ui">
        {section && (
          <>
            <span className="text-muted-foreground max-sm:hidden">
              {t(section)}
            </span>
            <ChevronRightIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground max-sm:hidden rtl:-scale-x-100"
            />
          </>
        )}
        <span className="truncate font-medium">{title}</span>
      </p>
      <CommandMenu role={role} />
      <LanguageSwitcher />
      <NotificationBell />
    </header>
  )
}
