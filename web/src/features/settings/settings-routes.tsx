import { dashboardPage } from "@/features/dashboard/overview-route"
import { dashboardPath } from "@/lib/navigation"
import type { Role } from "@/schemas/fields"
import { SettingsPage } from "./components/settings-page"

// Route options of the settings page, one per dashboard. The admin's page is `/admin/account`.
export const settingsRoute = (role: Role) => ({
  ...(role === "admin"
    ? dashboardPage("/admin/account", "settings.account_title")
    : dashboardPage(
        `${dashboardPath(role)}/settings`,
        "dashboard.nav_settings"
      )),
  component: () => <SettingsPage role={role} />,
})
