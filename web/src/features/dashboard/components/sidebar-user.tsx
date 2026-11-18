import { useQuery } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import {
  ArrowRightIcon,
  ChevronsUpDownIcon,
  GlobeIcon,
  LogOutIcon,
  UserRoundIcon,
} from "lucide-react"

import { initials } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import type { User } from "@sayaratak/shared/schemas/user"
import { useLogout } from "@/features/auth/queries"
import { businessQueries } from "@/features/directory/queries"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// The account card at the foot of the sidebar: the business (else the person) with a menu for setup, the admin account page, the public site and sign out. It is the dashboard's only account menu.
export function SidebarUser({ me }: { me: User }) {
  const { t, locale } = useT()
  const router = useRouter()
  const logout = useLogout()
  const isBusiness =
    me.role === "mechanic" || me.role === "workshop" || me.role === "dealership"
  const { data: business } = useQuery({
    ...businessQueries.mine,
    enabled: isBusiness,
  })
  const businessPhoto =
    business && "photoUrl" in business
      ? business.photoUrl
      : business && "logoUrl" in business
        ? business.logoUrl
        : undefined
  const photo = businessPhoto || me.avatarUrl
  const businessName = business?.name[locale]
  const title = businessName || me.fullName
  const role = t(`dashboard.role_${me.role}`)
  // A mechanic's profile usually carries the person's own name; then the second line is the role alone.
  const subtitle =
    businessName && businessName !== me.fullName
      ? `${me.fullName} · ${role}`
      : role
  const setup = !me.onboardingDone
  const link = (href: string, label: string, Icon: typeof GlobeIcon) => (
    <DropdownMenuItem render={<a href={localeHref(href, locale)} />}>
      <Icon
        aria-hidden="true"
        className={`text-muted-foreground ${Icon === ArrowRightIcon ? "rtl:-scale-x-100" : ""}`}
      />
      {label}
    </DropdownMenuItem>
  )
  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton
                  size="lg"
                  tooltip={{ children: title, side: "inline-end" }}
                  aria-label={
                    setup ? `${title}, ${t("nav.finish_setup")}` : undefined
                  }
                  className="relative gap-3 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10!"
                />
              }
            >
              <Avatar className="size-8 rounded-lg">
                {photo && <AvatarImage src={photo} alt="" />}
                <AvatarFallback className="rounded-lg bg-accent text-caption font-semibold text-accent-foreground">
                  <bdi>{initials(title)}</bdi>
                </AvatarFallback>
              </Avatar>
              {setup && (
                <span
                  aria-hidden="true"
                  className="absolute start-8 top-1.5 size-2 rounded-full bg-primary"
                />
              )}
              <span className="flex min-w-0 flex-1 flex-col text-start">
                <span className="truncate text-ui font-semibold">
                  <bdi>{title}</bdi>
                </span>
                <span className="truncate text-caption text-muted-foreground">
                  <bdi>{subtitle}</bdi>
                </span>
              </span>
              <ChevronsUpDownIcon
                aria-hidden="true"
                className="ms-auto size-4 text-muted-foreground"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-60">
              {setup &&
                link("/onboarding", t("nav.finish_setup"), ArrowRightIcon)}
              {me.role === "admin" &&
                link("/admin/account", t("nav.account"), UserRoundIcon)}
              {link("/", t("dashboard.view_site"), GlobeIcon)}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                closeOnClick={false}
                disabled={logout.isPending}
                onClick={() =>
                  logout.mutate(undefined, {
                    onSuccess: () =>
                      router.history.push(localeHref("/", locale)),
                  })
                }
              >
                <LogOutIcon
                  aria-hidden="true"
                  className="text-muted-foreground rtl:-scale-x-100"
                />
                {t("common.sign_out")}
              </DropdownMenuItem>
              {logout.isError && (
                <p role="alert" className="px-3 py-2 text-ui text-destructive">
                  {t("nav.sign_out_error")}
                </p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}
