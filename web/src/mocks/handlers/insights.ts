import {
  buildMarketplaceReport,
  type MarketInput,
} from "@sayaratak/shared/lib/marketplace-report"
import { minuteOf } from "@sayaratak/shared/lib/period"
import { buildRevenueReport } from "@sayaratak/shared/lib/revenue-report"
import { buildTrustReport } from "@sayaratak/shared/lib/trust-report"
import {
  activityDaysOf,
  buildUsersReport,
} from "@sayaratak/shared/lib/users-report"
import {
  marketplaceReportSchema,
  usersReportSchema,
} from "@sayaratak/shared/schemas/reports-insights"
import { revenueReportSchema } from "@sayaratak/shared/schemas/reports-revenue"
import { trustReportSchema } from "@sayaratak/shared/schemas/reports-trust"

import { db } from "../db"
import { needRole, route } from "../http"
import { businessOf } from "../lib"
import { windowsOf } from "./reports-account"

// Step 11.7-r10: the admin Insights tabs. The rules are the shared builders', as in the api; this file only gathers their inputs.

const earlier = (a: string | undefined, b: string) => (a && a < b ? a : b)

// First day of a call or WhatsApp click, or a message from someone other than the owner, per listing.
function firstContacts() {
  const first = new Map<string, string>()
  for (const e of db.events)
    if (e.counts.phone_click || e.counts.whatsapp_click)
      first.set(e.targetId, earlier(first.get(e.targetId), e.day))
  const owners = new Map(db.listings.map((l) => [l.id, l.ownerUserId]))
  const listingOf = new Map(
    db.threads
      .filter((t) => t.subjectType === "listing")
      .map((t) => [t.id, t.subjectId])
  )
  for (const m of db.messages) {
    const id = listingOf.get(m.threadId)
    if (id && owners.get(id) !== m.senderId)
      first.set(id, earlier(first.get(id), minuteOf(m.createdAt).slice(0, 10)))
  }
  return first
}

route("GET", "/admin/insights/marketplace", (c) => {
  needRole(c, "admin")
  const first = firstContacts()
  const listings = db.listings.flatMap((l): MarketInput[] =>
    l.moderation === "draft"
      ? []
      : [
          {
            id: l.id,
            ownerUserId: l.ownerUserId,
            kind: l.kind,
            intent: l.intent,
            condition: l.condition,
            makeId: l.makeId,
            modelId: l.modelId,
            year: l.year,
            rentPeriod: l.rentPeriod,
            price: l.price,
            status: l.status,
            expiresAt: l.expiresAt,
            soldAt: l.soldAt ?? null,
            vehicleType: l.vehicleType,
            cityId: l.cityId,
            moderation: l.moderation,
            createdAt: l.createdAt,
            decidedAt: l.decidedAt ?? null,
            firstContactDay: first.get(l.id) ?? null,
          },
        ]
  )
  return marketplaceReportSchema.parse(
    buildMarketplaceReport({
      ...windowsOf(c.query),
      listings,
      now: Date.now(),
    })
  )
})

route("GET", "/admin/insights/users", (c) => {
  needRole(c, "admin")
  const windows = windowsOf(c.query)
  const { first, last } = activityDaysOf(windows.period)
  return usersReportSchema.parse(
    buildUsersReport({
      ...windows,
      users: db.users.map((u) => ({
        id: u.id,
        role: u.role,
        locale: u.locale,
        createdAt: u.createdAt,
        method: u.signupMethod ?? "email",
      })),
      activity: db.activity.filter((a) => a.day >= first && a.day <= last),
      activeSince: db.activity.map((a) => a.day).sort()[0] ?? null,
    })
  )
})

// Step 11.7-r11: the Revenue tab.
route("GET", "/admin/insights/revenue", (c) => {
  needRole(c, "admin")
  return revenueReportSchema.parse(
    buildRevenueReport({
      ...windowsOf(c.query),
      payments: db.payments,
      subs: db.subscriptions,
      accounts: db.users.map((u) => {
        const b = businessOf(u)?.row
        return {
          id: u.id,
          role: u.role,
          name: b?.name ?? { ar: u.fullName, en: u.fullName },
          businessId: b?.id ?? null,
        }
      }),
      plans: db.plans,
      now: Date.now(),
    })
  )
})

// Step 11.7-r12a: the Trust & safety tab.
route("GET", "/admin/insights/trust", (c) => {
  needRole(c, "admin")
  const decided = (at: string | undefined) => at ?? null
  return trustReportSchema.parse(
    buildTrustReport({
      ...windowsOf(c.query),
      listings: db.listings
        .filter((l) => l.moderation !== "draft")
        .map((l) => ({
          createdAt: l.createdAt,
          moderation: l.moderation,
          decidedAt: decided(l.decidedAt),
          rejectionCode: l.rejectionCode ?? null,
        })),
      reports: db.reports.map((r) => ({
        ...r,
        decidedAt: decided(r.decidedAt),
      })),
      verifications: db.verifications.map((v) => ({
        ...v,
        decidedAt: decided(v.decidedAt),
      })),
      reviews: db.reviews.map((r) => ({
        status: r.status,
        flaggedAt: r.flaggedAt ?? null,
        decidedAt: decided(r.decidedAt),
      })),
      now: Date.now(),
    })
  )
})
