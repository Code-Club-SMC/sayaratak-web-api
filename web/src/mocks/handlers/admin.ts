import {
  activitySchema,
  adminBusinessSchema,
  adminSearchSchema,
  adminSeriesSchema,
  adminStatsSchema,
  okSchema,
} from "@/schemas/api"
import { verificationRequestSchema } from "@/schemas/admin"
import {
  assignPlanInputSchema,
  adminListingPatchSchema,
  banInputSchema,
  bulkInputSchema,
  businessAdminPatchSchema,
  rejectInputSchema,
} from "@/schemas/inputs"
import { listingSchema } from "@/schemas/listing"
import { pageOf } from "@/schemas/fields"
import { userSchema } from "@/schemas/user"

import { db, find, insert, newId } from "../db"
import { fail, needRole, route, type Ctx } from "../http"
import {
  DAY_MS,
  businessType,
  byNewest,
  dayKey,
  eventSeries,
  findBusiness,
  listPage,
  nowIso,
  notify,
  rangeDays,
} from "../lib"
import { matches } from "../search"
import type { ListingRow } from "../types"

const admin = (c: Ctx) => needRole(c, "admin")
const recent = (iso: string, days: number) =>
  Date.now() - Date.parse(iso) < days * DAY_MS
const listingOf = (id: string) => {
  const row = find(db.listings, id)
  if (!row) throw fail(404, "not_found")
  return row
}

route("GET", "/admin/stats", (c) => {
  admin(c)
  return adminStatsSchema.parse({
    users: db.users.length,
    listings: db.listings.filter((l) => l.moderation === "approved").length,
    businesses:
      db.dealerships.length + db.workshops.length + db.mechanics.length,
    pendingListings: db.listings.filter((l) => l.moderation === "pending")
      .length,
    pendingPayments: db.payments.filter((p) => p.status === "pending_review")
      .length,
    pendingVerifications: db.verifications.filter((v) => v.status === "pending")
      .length,
    openReports: db.reports.filter((r) => r.status === "open").length,
    activeSubscriptions: db.subscriptions.filter((s) => s.status === "active")
      .length,
    revenue: db.payments
      .filter((p) => p.status === "approved")
      .reduce((s, p) => s + p.amount, 0),
    newUsers7d: db.users.filter((u) => recent(u.createdAt, 7)).length,
    newListings7d: db.listings.filter((l) => recent(l.createdAt, 7)).length,
  })
})

route("GET", "/admin/series", (c) => {
  admin(c)
  const views = eventSeries(() => true, rangeDays(c.query))
  const count = (rows: { createdAt: string }[], day: string) =>
    rows.filter((r) => dayKey(Date.parse(r.createdAt)) === day).length
  return adminSeriesSchema.parse(
    views.map((d) => ({
      day: d.day,
      views: d.views,
      users: count(db.users, d.day),
      listings: count(db.listings, d.day),
    }))
  )
})

route("GET", "/admin/activity", (c) => {
  admin(c)
  const feed = [
    ...db.listings.map((l) => ({
      id: l.id,
      type: "listing" as const,
      subject: l.title,
      createdAt: l.createdAt,
      href: `/admin/listings`,
    })),
    ...db.users.map((u) => ({
      id: u.id,
      type: "user" as const,
      subject: u.fullName,
      createdAt: u.createdAt,
      href: `/admin/users`,
    })),
    ...db.payments.map((p) => ({
      id: p.id,
      type: "payment" as const,
      subject: p.reference,
      createdAt: p.createdAt,
      href: `/admin/payments`,
    })),
    ...db.reports.map((r) => ({
      id: r.id,
      type: "report" as const,
      subject: r.reason,
      createdAt: r.createdAt,
      href: `/admin/reports`,
    })),
    ...db.verifications.map((v) => ({
      id: v.id,
      type: "verification" as const,
      subject: v.targetId,
      createdAt: v.createdAt,
      href: `/admin/verifications`,
    })),
  ]
  return activitySchema.parse(feed.sort(byNewest).slice(0, 15))
})

route("GET", "/admin/search", (c) => {
  admin(c)
  const q = (c.query.get("q") ?? "").trim().toLowerCase()
  const has = (...parts: (string | undefined)[]) =>
    parts.some((p) => p?.toLowerCase().includes(q))
  if (!q)
    return adminSearchSchema.parse({
      listings: [],
      users: [],
      businesses: [],
      payments: [],
    })
  const businesses = [
    ...db.dealerships.map((b) => ({
      id: b.id,
      name: b.name,
      type: "dealership" as const,
    })),
    ...db.workshops.map((b) => ({
      id: b.id,
      name: b.name,
      type: "workshop" as const,
    })),
    ...db.mechanics.map((b) => ({
      id: b.id,
      name: b.name,
      type: "mechanic" as const,
    })),
  ]
  return adminSearchSchema.parse({
    listings: db.listings
      .filter((l) => has(l.title, l.id))
      .slice(0, 5)
      .map((l) => ({ id: l.id, title: l.title })),
    users: db.users
      .filter((u) => has(u.fullName, u.phone, u.email))
      .slice(0, 5)
      .map((u) => ({
        id: u.id,
        name: u.fullName,
        phone: u.phone,
        email: u.email,
      })),
    businesses: businesses.filter((b) => has(b.name)).slice(0, 5),
    payments: db.payments
      .filter((p) => has(p.reference))
      .slice(0, 5)
      .map((p) => ({ id: p.id, reference: p.reference })),
  })
})

// Moderation. Approving also feeds saved-search alerts.
export function approveListing(row: ListingRow) {
  row.moderation = "approved"
  row.rejectionReason = null
  row.updatedAt = nowIso()
  notify(
    row.ownerUserId,
    "listing_approved",
    { ar: "تمت الموافقة على إعلانك", en: "Your listing was approved" },
    { ar: row.title, en: row.title },
    "/account/listings"
  )
  for (const s of db.savedSearches) {
    if (!s.alerts || s.userId === row.ownerUserId || !matches(row, s.params))
      continue
    s.newCount += 1
    notify(
      s.userId,
      "saved_search_match",
      { ar: "إعلان جديد يطابق بحثك", en: "A new listing matches your search" },
      { ar: row.title, en: row.title },
      `/listing/${row.slug}`
    )
  }
}
function rejectListing(row: ListingRow, reason: string) {
  row.moderation = "rejected"
  row.rejectionReason = reason
  row.updatedAt = nowIso()
  notify(
    row.ownerUserId,
    "listing_rejected",
    { ar: "تم رفض إعلانك", en: "Your listing was rejected" },
    { ar: reason, en: reason },
    "/account/listings"
  )
}
const apply = (
  action: "approve" | "reject" | "remove" | "restore",
  row: ListingRow,
  reason = ""
) => {
  if (action === "approve" || action === "restore") approveListing(row)
  else if (action === "reject") rejectListing(row, reason || "—")
  else row.moderation = "removed"
}

route("GET", "/admin/moderation", (c) => {
  admin(c)
  return pageOf(listingSchema).parse(
    listPage(
      c,
      db.listings.filter((l) => l.moderation === "pending").sort(byNewest),
      (l) => l.title
    )
  )
})
for (const action of ["approve", "reject", "remove", "restore"] as const) {
  route("POST", `/admin/listings/:id/${action}`, async (c) => {
    admin(c)
    const row = listingOf(c.params.id ?? "")
    apply(
      action,
      row,
      action === "reject" ? (await c.body(rejectInputSchema)).reason : ""
    )
    return listingSchema.parse(row)
  })
}
route("POST", "/admin/listings/bulk", async (c) => {
  admin(c)
  const { ids, action, reason } = await c.body(bulkInputSchema)
  if (action === "reject" && !reason)
    throw fail(422, "validation", { reason: "validation.required" })
  for (const row of ids.flatMap((id) => db.listings.filter((l) => l.id === id)))
    apply(action, row, reason)
  return okSchema.parse({ ok: true })
})
route("GET", "/admin/listings", (c) => {
  admin(c)
  const rows = db.listings
    .filter(
      (l) =>
        !c.query.get("moderation") || l.moderation === c.query.get("moderation")
    )
    .filter((l) => !c.query.get("status") || l.status === c.query.get("status"))
    .sort(byNewest)
  return pageOf(listingSchema).parse(
    listPage(c, rows, (l) => `${l.title} ${l.id} ${l.owner.name}`)
  )
})
route("PATCH", "/admin/listings/:id", async (c) => {
  admin(c)
  const row = listingOf(c.params.id ?? "")
  const patch = await c.body(adminListingPatchSchema)
  Object.assign(row, patch, { updatedAt: nowIso() })
  return listingSchema.parse(row)
})

route("GET", "/admin/users", (c) => {
  admin(c)
  const rows = db.users
    .filter((u) => !c.query.get("role") || u.role === c.query.get("role"))
    .filter((u) => c.query.get("banned") !== "true" || u.banned)
    .sort(byNewest)
  const page = listPage(
    c,
    rows,
    (u) => `${u.fullName} ${u.phone ?? ""} ${u.email ?? ""}`
  )
  return pageOf(userSchema).parse(page)
})
for (const ban of [true, false]) {
  route("POST", `/admin/users/:id/${ban ? "ban" : "unban"}`, async (c) => {
    admin(c)
    const user = find(db.users, c.params.id ?? "")
    if (!user) throw fail(404, "not_found")
    if (user.role === "admin") throw fail(403, "forbidden")
    user.banned = ban
    user.bannedReason = ban ? (await c.body(banInputSchema)).reason : undefined
    return userSchema.parse(user)
  })
}

const allBusinesses = () => [
  ...db.dealerships.map((b) => ({ ...b, type: "dealership" as const })),
  ...db.workshops.map((b) => ({ ...b, type: "workshop" as const })),
  ...db.mechanics.map((b) => ({ ...b, type: "mechanic" as const })),
]
route("GET", "/admin/businesses", (c) => {
  admin(c)
  const rows = allBusinesses()
    .filter((b) => !c.query.get("type") || b.type === c.query.get("type"))
    .sort(byNewest)
  return pageOf(adminBusinessSchema).parse(listPage(c, rows, (b) => b.name))
})
route("PATCH", "/admin/businesses/:id", async (c) => {
  admin(c)
  const row = findBusiness(c.params.id ?? "")
  const type = businessType(c.params.id ?? "")
  if (!row || !type) throw fail(404, "not_found")
  Object.assign(row, await c.body(businessAdminPatchSchema))
  return adminBusinessSchema.parse({ ...row, type })
})
// A custom plan for one business: replaces its active subscription.
route("POST", "/admin/businesses/:id/assign-plan", async (c) => {
  admin(c)
  const row = findBusiness(c.params.id ?? "")
  const plan = find(db.plans, (await c.body(assignPlanInputSchema)).planId)
  if (!row || !plan) throw fail(404, "not_found")
  for (const s of db.subscriptions)
    if (s.userId === row.ownerId && s.status === "active") s.status = "canceled"
  insert(db.subscriptions, {
    id: newId("sub"),
    userId: row.ownerId,
    planId: plan.id,
    status: "active",
    startsAt: nowIso(),
    endsAt: new Date(Date.now() + plan.durationDays * DAY_MS).toISOString(),
    usage: { used: 0, limit: plan.listingLimit ?? plan.vehicleLimit ?? null },
  })
  return okSchema.parse({ ok: true })
})

route("GET", "/admin/verifications", (c) => {
  admin(c)
  const rows = db.verifications
    .filter((v) => !c.query.get("status") || v.status === c.query.get("status"))
    .sort(byNewest)
  return pageOf(verificationRequestSchema).parse(listPage(c, rows))
})
const verificationOf = (id: string) => {
  const row = find(db.verifications, id)
  if (!row) throw fail(404, "not_found")
  return row
}
route("POST", "/admin/verifications/:id/approve", (c) => {
  admin(c)
  const row = verificationOf(c.params.id ?? "")
  row.status = "approved"
  const target = findBusiness(row.targetId)
  if (target) target.verified = true
  notify(
    row.ownerId,
    "verification_result",
    { ar: "تم توثيق حسابك", en: "You are verified" },
    { ar: "ظهرت الشارة على صفحتك.", en: "The badge now shows on your page." },
    "/verification"
  )
  return verificationRequestSchema.parse(row)
})
route("POST", "/admin/verifications/:id/reject", async (c) => {
  admin(c)
  const row = verificationOf(c.params.id ?? "")
  const { reason } = await c.body(rejectInputSchema)
  row.status = "rejected"
  row.rejectionReason = reason
  notify(
    row.ownerId,
    "verification_result",
    { ar: "تعذر توثيق حسابك", en: "Verification was declined" },
    { ar: reason, en: reason },
    "/verification"
  )
  return verificationRequestSchema.parse(row)
})
