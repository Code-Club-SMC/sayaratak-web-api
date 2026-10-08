import { stripSearchParams } from "@tanstack/react-router"

import { dashboardPage } from "@/features/dashboard/overview-route"
import { dashboardPath } from "@/lib/navigation"
import type { TargetType } from "@/schemas/review"
import { ReviewsManagerPage } from "./components/reviews-manager-page"
import {
  reviewsSearchDefaults,
  reviewsSearchSchema,
  type ReviewsSearch,
} from "./schemas"

// Route options of `<dashboard>/reviews`, the same for the three business roles.
export const reviewsRoute = (targetType: TargetType) => ({
  validateSearch: reviewsSearchSchema,
  search: {
    middlewares: [stripSearchParams<ReviewsSearch>(reviewsSearchDefaults)],
  },
  ...dashboardPage(
    `${dashboardPath(targetType)}/reviews`,
    "dashboard.nav_reviews"
  ),
  component: () => <ReviewsManagerPage targetType={targetType} />,
})
