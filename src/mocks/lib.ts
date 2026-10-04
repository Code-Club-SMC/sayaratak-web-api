import type { Bilingual } from "@/schemas/fields"
import type { Notification } from "@/schemas/messaging"
import { db, find, newId, paginate } from "./db"
import { fail, pageParams, type Ctx } from "./http"
import type { ListingRow, UserRow } from "./types"

export const DAY_MS = 86_400_000
export const nowIso = () => new Date().toISOString()
export const dayKey = (d: Date | number = new Date()) =>
  new Date(d).toISOString().slice(0, 10)

// Text is stored in the recipient's language.
export function notify(
  userId: string,
  type: Notification["type"],
  title: Bilingual,
  body: Bilingual,
  href?: string
) {
  const user = find(db.users, userId)
  if (!user) return
  db.notifications.unshift({
    id: newId("n"),
    userId,
    type,
    title: title[user.locale],
    body: body[user.locale],
    href,
    createdAt: nowIso(),
  })
}

export const businessOf = (user: Pick<UserRow, "id" | "role">) => {
  if (user.role === "dealership")
    return {
      type: "dealership" as const,
      row: db.dealerships.find((d) => d.ownerId === user.id),
    }
  if (user.role === "workshop")
    return {
      type: "workshop" as const,
      row: db.workshops.find((d) => d.ownerId === user.id),
    }
  if (user.role === "mechanic")
    return {
      type: "mechanic" as const,
      row: db.mechanics.find((d) => d.ownerId === user.id),
    }
  return null
}
export const findBusiness = (id: string) =>
  find(db.dealerships, id) ?? find(db.workshops, id) ?? find(db.mechanics, id)
export const businessType = (id: string) =>
  find(db.dealerships, id)
    ? ("dealership" as const)
    : find(db.workshops, id)
      ? ("workshop" as const)
      : find(db.mechanics, id)
        ? ("mechanic" as const)
        : null

const live = (l: ListingRow) =>
  (l.moderation === "pending" || l.moderation === "approved") &&
  (l.status === "available" || l.status === "reserved")
export const listingUsage = (userId: string) =>
  db.listings.filter((l) => l.ownerUserId === userId && live(l)).length
export function listingLimit(userId: string) {
  const sub = db.subscriptions.find(
    (s) => s.userId === userId && s.status === "active"
  )
  const plan = sub ? find(db.plans, sub.planId) : undefined
  return (
    plan?.listingLimit ??
    plan?.vehicleLimit ??
    (sub ? null : db.settings.freeListingLimit)
  )
}

export function canEditListing(user: UserRow, listing: ListingRow) {
  if (user.role !== "admin" && listing.ownerUserId !== user.id)
    throw fail(403, "forbidden")
}
export function listingById(id: string) {
  const row = find(db.listings, id)
  if (!row) throw fail(404, "not_found")
  return row
}

// Generic paged list for tables: newest first (the caller sorts), optional `q` over a text projection.
export function listPage<T>(
  c: Ctx,
  rows: T[],
  text?: (r: T) => string,
  size = 20
) {
  const q = c.query.get("q")?.trim().toLowerCase()
  const kept =
    q && text ? rows.filter((r) => text(r).toLowerCase().includes(q)) : rows
  const { page, pageSize } = pageParams(c.query, size)
  return paginate(kept, page, pageSize)
}
export const byNewest = <T extends { createdAt: string }>(a: T, b: T) =>
  b.createdAt.localeCompare(a.createdAt)

export const rangeDays = (query: URLSearchParams) => {
  const r = query.get("range")
  return r === "7d" ? 7 : r === "90d" ? 90 : 30
}
// Daily sums of the event table for some targets, oldest first, with empty days filled in.
export function eventSeries(
  match: (targetId: string) => boolean,
  days: number
) {
  const byDay = new Map<
    string,
    {
      views: number
      phoneClicks: number
      whatsappClicks: number
      shares: number
    }
  >()
  for (const e of db.events) {
    if (!match(e.targetId)) continue
    const cur = byDay.get(e.day) ?? {
      views: 0,
      phoneClicks: 0,
      whatsappClicks: 0,
      shares: 0,
    }
    cur.views += e.counts.view
    cur.phoneClicks += e.counts.phone_click
    cur.whatsappClicks += e.counts.whatsapp_click
    cur.shares += e.counts.share
    byDay.set(e.day, cur)
  }
  return Array.from({ length: days }, (_, i) => {
    const day = dayKey(Date.now() - (days - 1 - i) * DAY_MS)
    return {
      day,
      ...(byDay.get(day) ?? {
        views: 0,
        phoneClicks: 0,
        whatsappClicks: 0,
        shares: 0,
      }),
    }
  })
}
