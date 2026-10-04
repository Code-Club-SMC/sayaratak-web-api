import { z } from "zod"

export const eventTypeSchema = z.enum([
  "view",
  "phone_click",
  "whatsapp_click",
  "share",
  "banner_click",
  "banner_view",
])
export type EventType = z.infer<typeof eventTypeSchema>

export const notificationPrefsSchema = z.object({
  messages: z.boolean(),
  listings: z.boolean(),
  savedSearches: z.boolean(),
  reviews: z.boolean(),
  marketing: z.boolean(),
})
export type NotificationPrefs = z.infer<typeof notificationPrefsSchema>
