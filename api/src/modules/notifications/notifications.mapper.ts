import type { Role } from "@sayaratak/shared/schemas/fields"
import type { Notification } from "@sayaratak/shared/schemas/messaging"

import type { notifications } from "./notifications.tables"

type NotificationRow = typeof notifications.$inferSelect

export function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href ?? undefined,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt?.toISOString(),
  }
}

// The dashboard of each role (web `dashboardPath`).
const DASHBOARD: Record<Role, string> = {
  user: "/account",
  dealership: "/dealer",
  workshop: "/workshop",
  mechanic: "/mechanic",
  admin: "/admin",
}
// Where each role reads its messages (web `messagesPath`; the admin has no inbox and shares the account's).
const MESSAGES: Record<Role, string> = {
  user: "/account/messages",
  dealership: "/dealer/messages",
  workshop: "/workshop/inquiries",
  mechanic: "/mechanic/inquiries",
  admin: "/account/messages",
}
// Dashboard pages that callers write without the role's base: "/billing" is "/dealer/billing" for a dealer.
const UNDER_BASE = new Set([
  "/billing",
  "/reviews",
  "/verification",
  "/saved-searches",
  "/notifications",
])

/**
 * The recipient's real path for a notification link. Callers write
 * `/messages?thread=t-1`, `/listings` or `/billing` with no role; public paths pass through.
 * Example: a workshop gets `/workshop/inquiries?thread=t-1` for `/messages?thread=t-1`.
 */
export function toNotificationHref(role: Role, href: string) {
  const [path = "", query] = href.split("?")
  const to = destinationOf(role, path)
  return query ? `${to}?${query}` : to
}

function destinationOf(role: Role, path: string) {
  if (path === "/messages") return MESSAGES[role]
  if (path === "/listings")
    return role === "dealership" ? "/dealer/inventory" : "/account/listings"
  return UNDER_BASE.has(path) ? DASHBOARD[role] + path : path
}
