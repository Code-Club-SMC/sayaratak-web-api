import { adminBusinessSchema, okSchema } from "@/schemas/api"
import {
  activitySchema,
  adminSearchSchema,
  adminStatsSchema,
} from "@/schemas/responses"
import {
  adminVerificationSchema,
  type VerificationRequest,
} from "@/schemas/admin"
import {
  assignPlanInputSchema,
  adminListingPatchSchema,
  banInputSchema,
  bulkInputSchema,
  businessAdminPatchSchema,
  rejectInputSchema,
} from "@/schemas/inputs"
import { listingSchema, typeFilterSchema } from "@/schemas/listing"
import { pageOf } from "@/schemas/fields"
import { userSchema } from "@/schemas/user"
import type { z } from "zod"
import { both } from "@/mocks/seed/util"

import { db, find, insert, newId } from "../db"
import { fail, needRole, route, type Ctx } from "../http"
import {
  DAY_MS,
  businessType,
  byNewest,
  dayKey,
  findBusiness,
  listPage,
  nowIso,
  notify,
  publicUser,
  rangeDays,
  textOf,
} from "../lib"
import { matches } from "../search"
import type { ListingRow, UserRow } from "../types"

const admin = (c: Ctx) => needRole(c, "admin")
const listingOf = (id: string) => {
  const row = find(db.listings, id)
  if (!row) throw fail(404, "not_found")
  return row
}

// KPI totals and the three daily series over the range (revenue is approved payments, by review day).
route("GET", "/admin/stats", (c) => {
  admin(c)
  const days = rangeDays(c.query)
  const since = Date.now() - days * DAY_MS
  const inRange = (iso: string) => Date.parse(iso) >= since
  const approved = db.payments.filter((p) => p.status === "approved")
  const perDay = <T>(
    rows: T[],
    at: (r: T) => string,
    value: (r: T) => number
  ) =>
    Array.from({ length: days }, (_, i) => {
      const date = dayKey(Date.now() - (days - 1 - i) * DAY_MS)
      return {
        date,
        value: rows
          .filter((r) => dayKey(Date.parse(at(r))) === date)
          .reduce((sum, r) => sum + value(r), 0),
      }
    })
  const live = db.listings.filter((l) => l.moderation === "approved")
  return adminStatsSchema.parse({
    range: `${days}d`,
    totals: {
      users: db.users.length,
      listings: live.length,
      vehicles: live.filter((l) => l.kind === "vehicle").length,
      dealerships: db.dealerships.length,
      workshops: db.workshops.length,
      mechanics: db.mechanics.length,
      activeSubscriptions: db.subscriptions.filter((s) => s.status === "active")
        .length,
      revenue: approved
        .filter((p) => inRange(p.reviewedAt ?? p.createdAt))
        .reduce((sum, p) => sum + p.amount, 0),
    },
    series: {
      newListings: perDay(
        db.listings,
        (l) => l.createdAt,
        () => 1
      ),
      newUsers: perDay(
        db.users,
        (u) => u.createdAt,
        () => 1
      ),
      revenue: perDay(
        approved,
        (p) => p.reviewedAt ?? p.createdAt,
        (p) => p.amount
      ),
    },
  })
})

// The ten newest events, each with the admin screen that shows it selected (`?id=`; a pending listing opens in the review queue, `?listing=`).
route("GET", "/admin/activity", (c) => {
  admin(c)
  const feed = [
    ...db.listings
      .filter((l) => l.moderation !== "draft")
      .map((l) => ({
        id: l.id,
        type: "listing_submitted" as const,
        label: both(l.title),
        href:
          l.moderation === "pending"
            ? `/admin/moderation?listing=${l.id}`
            : `/admin/listings?id=${l.id}`,
        createdAt: l.createdAt,
      })),
    ...(["dealership", "workshop", "mechanic"] as const).flatMap((type) =>
      db[`${type}s` as const].map((b) => ({
        id: b.id,
        type: "business_joined" as const,
        label: b.name,
        href: `/admin/${type}s?id=${b.id}`,
        createdAt: b.createdAt,
      }))
    ),
    ...db.payments.map((p) => ({
      id: p.id,
      type: "payment_submitted" as const,
      label: both(p.reference),
      href: `/admin/payments?id=${p.id}`,
      createdAt: p.createdAt,
    })),
    ...db.reports.map((r) => ({
      id: r.id,
      type: "report_filed" as const,
      label: both(find(db.listings, r.listingId)?.title ?? r.reason),
      href: `/admin/reports?id=${r.id}`,
      createdAt: r.createdAt,
    })),
  ]
  return activitySchema.parse({ items: feed.sort(byNewest).slice(0, 10) })
})

// Up to five hits per kind, each with a second line and the admin screen that opens it.
route("GET", "/admin/search", (c) => {
  admin(c)
  const q = (c.query.get("q") ?? "").trim().toLowerCase()
  const has = (...parts: (string | undefined)[]) =>
    parts.some((p) => p?.toLowerCase().includes(q))
  const businesses = (["dealership", "workshop", "mechanic"] as const).flatMap(
    (type) =>
      db[`${type}s` as const].map((b) => ({
        id: b.id,
        label: b.name,
        detail: type,
        href: `/admin/${type}s?id=${b.id}`,
      }))
  )
  const none = { listings: [], users: [], businesses: [], payments: [] }
  if (!q) return adminSearchSchema.parse(none)
  return adminSearchSchema.parse({
    listings: db.listings
      .filter((l) => has(l.title, l.id))
      .slice(0, 5)
      .map((l) => ({
        id: l.id,
        label: both(l.title),
        detail: l.moderation,
        href: `/admin/listings?id=${l.id}`,
      })),
    users: db.users
      .filter((u) => has(u.fullName, u.phone, u.email))
      .slice(0, 5)
      .map((u) => ({
        id: u.id,
        label: both(u.fullName),
        detail: u.phone ?? u.email ?? null,
        href: `/admin/users?id=${u.id}`,
      })),
    businesses: businesses
      .filter((b) => has(b.label.ar, b.label.en))
      .slice(0, 5),
    payments: db.payments
      .filter((p) => has(p.reference, p.payerName))
      .slice(0, 5)
      .map((p) => ({
        id: p.id,
        label: both(p.reference),
        detail: p.payerName,
        href: `/admin/payments?id=${p.id}`,
      })),
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
    "/listings"
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
    "/listings"
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

// Pending listings, newest first. `type` is a vehicle type or "part"; `sellerKind` is individual, dealership or verified.
route("GET", "/admin/moderation", (c) => {
  admin(c)
  const type = typeFilterSchema.safeParse(c.query.get("type")).data
  const kind = c.query.get("sellerKind")
  const rows = db.listings
    .filter((l) => l.moderation === "pending")
    .filter(
      (l) =>
        !type || (type === "part" ? l.kind === "part" : l.vehicleType === type)
    )
    .filter(
      (l) =>
        (kind !== "individual" || l.owner.type === "user") &&
        (kind !== "dealership" || l.owner.type === "dealership") &&
        (kind !== "verified" || l.owner.verified)
    )
    .sort(byNewest)
  return pageOf(listingSchema).parse(listPage(c, rows, (l) => l.title))
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
    .filter(
      (l) => !c.query.get("ownerId") || l.ownerUserId === c.query.get("ownerId")
    )
    .sort(byNewest)
  return pageOf(listingSchema).parse(
    listPage(c, rows, (l) => `${l.title} ${l.id} ${textOf(l.owner.name)}`)
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
  return pageOf(userSchema).parse({
    ...page,
    items: page.items.map(publicUser),
  })
})
// No notification: the banned person finds out on their next request (403 `banned`, then the suspended page).
export function setBan(user: UserRow, input?: z.infer<typeof banInputSchema>) {
  user.banned = !!input
  user.bannedReason = input?.reason
  user.bannedUntil =
    input && input.duration !== "permanent"
      ? new Date(
          Date.now() + (input.duration === "7d" ? 7 : 30) * DAY_MS
        ).toISOString()
      : undefined
}
for (const ban of [true, false]) {
  route("POST", `/admin/users/:id/${ban ? "ban" : "unban"}`, async (c) => {
    admin(c)
    const user = find(db.users, c.params.id ?? "")
    if (!user) throw fail(404, "not_found")
    if (user.role === "admin") throw fail(403, "forbidden")
    setBan(user, ban ? await c.body(banInputSchema) : undefined)
    return publicUser(user)
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
  return pageOf(adminBusinessSchema).parse(
    listPage(c, rows, (b) => textOf(b.name))
  )
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
  const input = await c.body(assignPlanInputSchema)
  const plan = find(db.plans, input.planId)
  if (!row || !plan) throw fail(404, "not_found")
  for (const s of db.subscriptions)
    if (s.userId === row.ownerId && s.status === "active") s.status = "canceled"
  insert(db.subscriptions, {
    id: newId("sub"),
    userId: row.ownerId,
    planId: plan.id,
    status: "active",
    startsAt: nowIso(),
    endsAt: new Date(
      Date.now() + (input.durationDays ?? plan.durationDays) * DAY_MS
    ).toISOString(),
    price: input.price ?? plan.price,
    usage: {
      used: 0,
      limit:
        input.limit === undefined
          ? (plan.listingLimit ?? plan.vehicleLimit ?? null)
          : input.limit,
    },
  })
  return okSchema.parse({ ok: true })
})

// `status` filters the tab; `id` returns that one request, for a sheet opened from a link; `q` matches the business and owner names.
const verificationRow = (v: VerificationRequest) => {
  const biz = findBusiness(v.targetId)
  const owner = find(db.users, v.ownerId)
  return {
    ...v,
    target: biz
      ? {
          name: biz.name,
          slug: biz.slug,
          imageUrl: "logoUrl" in biz ? biz.logoUrl : biz.photoUrl,
          cityId: biz.cityId,
        }
      : null,
    owner: owner
      ? { name: owner.fullName, phone: owner.phone, email: owner.email }
      : null,
  }
}
route("GET", "/admin/verifications", (c) => {
  admin(c)
  const status = c.query.get("status")
  const id = c.query.get("id")
  const rows = db.verifications
    .filter((v) => (!status || v.status === status) && (!id || v.id === id))
    .sort(byNewest)
    .map(verificationRow)
  return pageOf(adminVerificationSchema).parse(
    listPage(
      c,
      rows,
      (v) => `${v.target ? textOf(v.target.name) : ""} ${v.owner?.name ?? ""}`
    )
  )
})
// Only a pending request can be decided.
const verificationOf = (id: string) => {
  const row = find(db.verifications, id)
  if (!row) throw fail(404, "not_found")
  if (row.status !== "pending") throw fail(409, "conflict")
  return row
}
route("POST", "/admin/verifications/:id/approve", (c) => {
  admin(c)
  const row = verificationOf(c.params.id ?? "")
  row.status = "approved"
  const target = findBusiness(row.targetId)
  if (target) target.verified = true
  // Listings copy their dealership's badge when posted, so the copies follow.
  if (row.targetType === "dealership")
    for (const l of db.listings)
      if (l.ownerUserId === row.ownerId && l.owner.type === "dealership")
        l.owner.verified = true
  notify(
    row.ownerId,
    "verification_result",
    { ar: "تم توثيق حسابك", en: "You are verified" },
    { ar: "ظهرت الشارة على صفحتك.", en: "The badge now shows on your page." },
    "/verification"
  )
  return adminVerificationSchema.parse(verificationRow(row))
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
  return adminVerificationSchema.parse(verificationRow(row))
})
