import {
  BadgeCheckIcon,
  BookmarkIcon,
  BuildingIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  CreditCardIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  StarIcon,
  type LucideIcon,
} from "lucide-react"

import type { Notification } from "@sayaratak/shared/schemas/messaging"

export const notificationIcon: Record<Notification["type"], LucideIcon> = {
  message: MessageSquareIcon,
  listing_approved: CircleCheckIcon,
  listing_rejected: CircleXIcon,
  saved_search_match: BookmarkIcon,
  review_new: StarIcon,
  payment_approved: CreditCardIcon,
  payment_rejected: CircleAlertIcon,
  subscription_expiring: ClockIcon,
  verification_result: BadgeCheckIcon,
  business_status: BuildingIcon,
  broadcast: MegaphoneIcon,
}
