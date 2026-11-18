import { buildListingsReport } from "@sayaratak/shared/lib/listings-report"
import {
  listingsReportQuerySchema,
  listingsReportSchema,
} from "@sayaratak/shared/schemas/reports"

import { db } from "../db"
import { needUser, route } from "../http"
import { periodOf } from "../period"

// The Listings report (step 11.7-r5): the account's approved listings with the period's counts; the rules are the shared builder's, as in the api.
route("GET", "/me/reports/listings", (c) => {
  const user = needUser(c)
  const query = listingsReportQuerySchema.parse(Object.fromEntries(c.query))
  const { period, current } = periodOf(c.query)
  const mine = db.listings
    .filter((l) => l.ownerUserId === user.id && l.moderation === "approved")
    .sort((a, b) => (a.id < b.id ? -1 : 1))
  const threads = new Map(
    db.threads
      .filter((t) => t.subjectType === "listing")
      .map((t) => [t.id, t.subjectId])
  )
  const received = new Map<string, number>()
  for (const m of db.messages) {
    const listingId = threads.get(m.threadId)
    if (!listingId || m.senderId === user.id || !current.has(m.createdAt))
      continue
    received.set(listingId, (received.get(listingId) ?? 0) + 1)
  }
  return listingsReportSchema.parse(
    buildListingsReport({
      period,
      query,
      now: Date.now(),
      rows: mine.map((l) => {
        const only = (id: string) => id === l.id
        const cover = l.media[0]
        return {
          id: l.id,
          slug: l.slug,
          title: l.title,
          coverUrl:
            (cover?.type === "video" ? cover.posterUrl : cover?.url) ?? null,
          status: l.status,
          photos: l.media.filter((m) => m.type === "image").length,
          liveSince: l.decidedAt ?? l.createdAt,
          expiresAt: l.expiresAt,
          soldAt: l.soldAt ?? null,
          views: current.events(only, "view").total,
          calls: current.events(only, "phone_click").total,
          whatsapp: current.events(only, "whatsapp_click").total,
          messages: received.get(l.id) ?? 0,
        }
      }),
    })
  )
})
