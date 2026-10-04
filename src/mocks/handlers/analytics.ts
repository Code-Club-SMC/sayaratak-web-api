import { analyticsSchema, okSchema } from "@/schemas/api"
import { eventInputSchema } from "@/schemas/inputs"

import { db, find, insert } from "../db"
import { needUser, route } from "../http"
import { businessOf, dayKey, eventSeries, rangeDays } from "../lib"

const stat = {
  view: "views",
  phone_click: "phoneClicks",
  whatsapp_click: "whatsappClicks",
} as const

route("POST", "/events", async (c) => {
  const { type, targetId } = await c.body(eventInputSchema)
  const listing = find(db.listings, targetId)
  const key =
    type === "view" || type === "phone_click" || type === "whatsapp_click"
      ? stat[type]
      : null
  if (listing && key) listing.stats[key] += 1
  const banner = find(db.banners, targetId)
  if (banner && type === "banner_click") banner.clicks += 1
  if (banner && type === "banner_view") banner.impressions += 1
  const day = dayKey()
  const id = `ev-${targetId}-${day}`
  const row =
    find(db.events, id) ??
    insert(db.events, {
      id,
      day,
      targetId,
      counts: {
        view: 0,
        phone_click: 0,
        whatsapp_click: 0,
        share: 0,
        banner_click: 0,
        banner_view: 0,
      },
    })
  row.counts[type] += 1
  return okSchema.parse({ ok: true })
})

// Role scoped: sellers see their listings, business owners their profile, admins everything.
route("GET", "/me/analytics", (c) => {
  const user = needUser(c)
  const days = rangeDays(c.query)
  const listings =
    user.role === "admin"
      ? db.listings
      : db.listings.filter((l) => l.ownerUserId === user.id)
  const ids = new Set(listings.map((l) => l.id))
  const biz = businessOf(user)
  if (biz?.row) ids.add(biz.row.id)
  const series = eventSeries((id) => user.role === "admin" || ids.has(id), days)
  const sum = (k: "views" | "phoneClicks" | "whatsappClicks" | "shares") =>
    series.reduce((s, d) => s + d[k], 0)
  return analyticsSchema.parse({
    range: `${days}d`,
    totals: {
      views: sum("views"),
      phoneClicks: sum("phoneClicks"),
      whatsappClicks: sum("whatsappClicks"),
      shares: sum("shares"),
      favorites: listings.reduce((s, l) => s + l.stats.favorites, 0),
    },
    series,
    top: [...listings]
      .sort((a, b) => b.stats.views - a.stats.views)
      .slice(0, 5)
      .map((l) => ({ id: l.id, title: l.title, views: l.stats.views })),
  })
})
