import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useLocation } from "@tanstack/react-router"

import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import type { User } from "@sayaratak/shared/schemas/user"
import { BrandLogo } from "@/components/app/brand-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  useSidebar,
} from "@/components/ui/sidebar"
import { SidebarPlanCard } from "@/features/billing/components/sidebar-plan-card"
import { countsQuery } from "@/features/notifications/counts-query"
import { isActive, navConfig, navHref, type NavGroup } from "../nav-config"
import { AdminRail } from "./admin-rail"
import { SidebarNavItem } from "./sidebar-nav-item"
import { SidebarUser } from "./sidebar-user"

export function DashboardSidebar({ me }: { me: User }) {
  const { t, locale } = useT()
  const pathname = useLocation({ select: (l) => l.pathname })
  const { data: counts } = useQuery(countsQuery)
  const { isMobile } = useSidebar()
  const groups = navConfig[me.role]
  const hrefOf = (path: string) => localeHref(navHref(me.role, path), locale)
  const onPage = groups.findIndex((g) =>
    g.items.some((item) => isActive(pathname, hrefOf(item.path), !item.path))
  )
  // A section picked on the rail holds until the next navigation; then the section of the open page shows again.
  const [picked, setPicked] = useState<{ path: string; index: number }>()
  const current = picked?.path === pathname ? picked.index : Math.max(0, onPage)
  // Admin has 25 pages in 7 groups, so desktop shows one group at a time beside a rail; the mobile sheet and the other roles list every group.
  const rail = me.role === "admin" && !isMobile
  const shown = rail ? groups.slice(current, current + 1) : groups
  const busy = (group: NavGroup) =>
    group.items.some((item) => !!(item.count && counts?.[item.count]))
  const nav = (
    <nav aria-label={t("dashboard.menu")} className="flex flex-col">
      {shown.map((group, i) => (
        <SidebarGroup key={group.key ?? i} className="py-1">
          {group.key && (
            <SidebarGroupLabel
              className={rail ? "font-semibold text-foreground" : undefined}
            >
              {/* The type role sits on its own span: cn reads it as a text colour next to text-foreground. */}
              <span className={rail ? "text-ui" : undefined}>
                {t(group.key)}
              </span>
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const href = hrefOf(item.path)
                return (
                  <SidebarNavItem
                    key={item.key}
                    icon={item.icon}
                    label={t(item.key)}
                    href={href}
                    active={isActive(pathname, href, !item.path)}
                    count={item.count && counts?.[item.count]}
                  />
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </nav>
  )
  return (
    <Sidebar
      variant="inset"
      collapsible="icon"
      role="complementary"
      aria-label={t("dashboard.menu")}
      label={t("dashboard.menu")}
      className="[view-transition-name:dashboard-sidebar]"
    >
      <SidebarHeader className="px-4 py-4 group-data-[collapsible=icon]:h-14 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
        <div className="flex items-center justify-center group-data-[collapsible=icon]:hidden">
          <BrandLogo />
        </div>
        <div className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
          <BrandLogo compact />
        </div>
      </SidebarHeader>
      {rail ? (
        <div className="flex min-h-0 flex-1">
          <AdminRail
            groups={groups}
            current={current}
            busy={busy}
            onPick={(index) => setPicked({ path: pathname, index })}
          />
          <SidebarContent className="group-data-[collapsible=icon]:hidden">
            {nav}
          </SidebarContent>
        </div>
      ) : (
        <SidebarContent>{nav}</SidebarContent>
      )}
      {me.role !== "admin" && <SidebarPlanCard me={me} />}
      <SidebarUser me={me} />
    </Sidebar>
  )
}
