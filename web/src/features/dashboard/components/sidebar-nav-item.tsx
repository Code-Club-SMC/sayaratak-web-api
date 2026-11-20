import type { LucideIcon } from "lucide-react"

import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

// A11: items are 40 high with a 20 px icon, also when the sidebar is collapsed to icons.
// On the grey chrome the open page is a raised white row with a blue icon, the same lift as a panel.
export const itemClass =
  "h-10 gap-3 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10! hover:bg-muted data-active:bg-card data-active:shadow-panel [&_svg]:size-5 data-active:[&_svg]:text-primary"

export function SidebarNavItem({
  icon: Icon,
  label,
  href,
  active,
  count,
}: {
  icon: LucideIcon
  label: string
  href: string
  active: boolean
  count?: number
}) {
  const { t, locale } = useT()
  const { setOpenMobile } = useSidebar()
  const shown = count ? formatNumber(count, locale) : undefined
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={{ children: label, side: "inline-end" }}
        className={itemClass}
        render={
          <a
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={
              shown
                ? `${label}, ${t("dashboard.count_new", { number: shown })}`
                : undefined
            }
            onClick={() => setOpenMobile(false)}
          />
        }
      >
        <Icon aria-hidden="true" />
        <span className="text-ui">{label}</span>
      </SidebarMenuButton>
      {shown && (
        <SidebarMenuBadge
          aria-hidden="true"
          className="peer-data-[size=default]/menu-button:top-2.5"
        >
          {shown}
        </SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  )
}
