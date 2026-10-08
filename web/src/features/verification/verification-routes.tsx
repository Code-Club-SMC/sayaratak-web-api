import { dashboardPage } from "@/features/dashboard/overview-route"
import { dashboardPath } from "@/lib/navigation"
import type { TargetType } from "@/schemas/review"
import { VerificationPage } from "./components/verification-page"

// Route options of `<dashboard>/verification`, the same for the three business roles.
export const verificationRoute = (targetType: TargetType) => ({
  ...dashboardPage(
    `${dashboardPath(targetType)}/verification`,
    "dashboard.nav_verification"
  ),
  component: () => <VerificationPage targetType={targetType} />,
})
