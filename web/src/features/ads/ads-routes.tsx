import { dashboardPage } from "@/features/dashboard/overview-route"
import { dashboardPath } from "@/lib/navigation"
import { AdsPage } from "./components/ads-page"
import { NewCampaignPage } from "./components/new-campaign-page"

type Seller = "dealership" | "workshop" | "mechanic"

// `<dashboard>/ads` and `<dashboard>/ads/new`, the same for the three business roles.
export const adsRoute = (role: Seller) => ({
  ...dashboardPage(`${dashboardPath(role)}/ads`, "dashboard.nav_ads"),
  component: () => <AdsPage role={role} />,
})
export const newCampaignRoute = (role: Seller) => ({
  ...dashboardPage(`${dashboardPath(role)}/ads/new`, "ads.new_title"),
  component: () => <NewCampaignPage role={role} />,
})
