import { okSchema } from "@sayaratak/shared/schemas/api"
import { analyticsSchema } from "@sayaratak/shared/schemas/responses"
import { eventInputSchema } from "@sayaratak/shared/schemas/inputs"

import { db, find, insert } from "../db"
import { needUser, route } from "../http"
import { businessOf, dayKey } from "../lib"
import { bumpHour, khartoumHour } from "../event-hours"
import { contactHours, periodOf, total } from "../period"

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
  const campaign = find(db.campaigns, targetId)
  if (campaign && type === "banner_click") campaign.clicks += 1
  if (campaign && type === "banner_view") campaign.impressions += 1
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
  bumpHour(row, type, khartoumHour())
  return okSchema.parse({ ok: true })
})

// Role scoped: sellers see their listings, business owners their profile, admins everything. `previous` and `previousDaily` are the compare window (the period before, or a year earlier).
route("GET", "/me/analytics", (c) => {
  const user = needUser(c)
  const { period, current, compare, align, compareStarts, hourlySince } =
    periodOf(c.query)
  const all = user.role === "admin"
  const listings = all
    ? db.listings
    : db.listings.filter((l) => l.ownerUserId === user.id)
  const ids = new Set(listings.map((l) => l.id))
  const biz = businessOf(user)
  if (biz?.row) ids.add(biz.row.id)
  const mine = (id: string) => all || ids.has(id)
  const threads = new Set(
    db.threads
      .filter((t) => all || t.participantIds.includes(user.id))
      .map((t) => t.id)
  )
  const received = db.messages.filter(
    (m) => threads.has(m.threadId) && (all || m.senderId !== user.id)
  )
  const targets = new Set(biz?.row ? [biz.row.id] : [])
  const one = () => 1
  const read = (w: typeof current) => {
    const views = w.events(mine, "view")
    const calls = w.events(mine, "phone_click")
    const whatsapp = w.events(mine, "whatsapp_click")
    const messages = w.timed(received, (m) => m.createdAt, one)
    return {
      totals: {
        views: views.total,
        calls: calls.total,
        whatsapp: whatsapp.total,
        messages: total(messages),
        favorites: db.favorites.filter(
          (f) => mine(f.listingId) && w.has(f.createdAt)
        ).length,
        newReviews: db.reviews.filter(
          (r) => (all || targets.has(r.targetId)) && w.has(r.createdAt)
        ).length,
      },
      series: { views, calls, whatsapp, messages },
    }
  }
  const now = read(current)
  const before = read(compare)
  const buckets = (
    r: ReturnType<typeof read>,
    starts: string[],
    fit: (v: number[]) => number[] = (v) => v
  ) => {
    const views = fit(r.series.views.series)
    const calls = fit(r.series.calls.series)
    const whatsapp = fit(r.series.whatsapp.series)
    const messages = fit(r.series.messages)
    return starts.map((date, i) => ({
      date,
      views: views[i] ?? 0,
      calls: calls[i] ?? 0,
      whatsapp: whatsapp[i] ?? 0,
      messages: messages[i] ?? 0,
    }))
  }
  const topListings =
    user.role === "dealership"
      ? listings
          .map((l) => {
            const only = (id: string) => id === l.id
            const cover = l.media[0]
            return {
              id: l.id,
              slug: l.slug,
              title: l.title,
              coverUrl:
                (cover?.type === "video" ? cover.posterUrl : cover?.url) ??
                null,
              views: current.events(only, "view").total,
              contacts:
                current.events(only, "phone_click").total +
                current.events(only, "whatsapp_click").total,
            }
          })
          .sort((a, b) => b.views - a.views)
          .slice(0, 10)
      : []
  return analyticsSchema.parse({
    period,
    hourlySince,
    contactHours: contactHours({
      w: current,
      since: hourlySince,
      match: mine,
      messages: received,
    }),
    totals: now.totals,
    previous: before.totals,
    daily: buckets(now, current.starts),
    previousDaily: buckets(before, compareStarts, align),
    topListings,
  })
})
