import { broadcastSchema, okSchema } from "@/schemas/api"
import {
  paymentSchema,
  planSchema,
  promotionPriceSchema,
  promotionSchema,
  subscriptionSchema,
} from "@/schemas/billing"
import { pageOf } from "@/schemas/fields"
import {
  broadcastInputSchema,
  grantInputSchema,
  rejectInputSchema,
} from "@/schemas/inputs"

import { db, find, insert, newId, remove } from "../db"
import { fail, needRole, route, type Ctx } from "../http"
import {
  DAY_MS,
  byNewest,
  listPage,
  listingById,
  listingLimit,
  listingUsage,
  nowIso,
  notify,
} from "../lib"
import type { PromotionPriceRow } from "../types"

const admin = (c: Ctx) => needRole(c, "admin")
const paymentOf = (id: string) => {
  const row = find(db.payments, id)
  if (!row) throw fail(404, "not_found")
  if (row.status !== "pending_review") throw fail(409, "exists")
  return row
}
function addPromotion(
  listingId: string,
  type: PromotionPriceRow["type"],
  days: number,
  source: "paid" | "admin_grant",
  paymentId?: string
) {
  const listing = listingById(listingId)
  const startsAt = nowIso()
  const endsAt = new Date(Date.now() + days * DAY_MS).toISOString()
  listing.promotions.push({ type, startsAt, endsAt })
  return insert(db.promotions, {
    id: newId("promo"),
    listingId,
    type,
    startsAt,
    endsAt,
    source,
    paymentId,
  })
}

route("GET", "/admin/payments", (c) => {
  admin(c)
  const rows = db.payments
    .filter((p) => !c.query.get("status") || p.status === c.query.get("status"))
    .sort(byNewest)
  return pageOf(paymentSchema).parse(
    listPage(
      c,
      rows,
      (p) => `${p.reference} ${p.transactionRef} ${p.itemLabel}`
    )
  )
})
// Approval activates the plan or adds the promotion, then tells the payer.
route("POST", "/admin/payments/:id/approve", (c) => {
  admin(c)
  const row = paymentOf(c.params.id ?? "")
  if (row.itemType === "plan") {
    const plan = find(db.plans, row.itemId)
    if (!plan) throw fail(404, "not_found")
    for (const s of db.subscriptions)
      if (s.userId === row.userId && s.status === "active")
        s.status = "canceled"
    insert(db.subscriptions, {
      id: newId("sub"),
      userId: row.userId,
      planId: plan.id,
      status: "active",
      startsAt: nowIso(),
      endsAt: new Date(Date.now() + plan.durationDays * DAY_MS).toISOString(),
      usage: { used: 0, limit: plan.listingLimit ?? plan.vehicleLimit ?? null },
    })
  } else {
    const [listingId = "", type = ""] = row.itemId.split(":")
    const price = db.promotionPrices.find((p) => p.type === type)
    if (!price) throw fail(404, "not_found")
    addPromotion(listingId, price.type, price.durationDays, "paid", row.id)
  }
  row.status = "approved"
  row.reviewedAt = nowIso()
  notify(
    row.userId,
    "payment_approved",
    { ar: "تمت الموافقة على الدفع", en: "Payment approved" },
    { ar: row.itemLabel, en: row.itemLabel },
    "/billing"
  )
  return paymentSchema.parse(row)
})
route("POST", "/admin/payments/:id/reject", async (c) => {
  admin(c)
  const row = paymentOf(c.params.id ?? "")
  const { reason } = await c.body(rejectInputSchema)
  row.status = "rejected"
  row.rejectionReason = reason
  row.reviewedAt = nowIso()
  notify(
    row.userId,
    "payment_rejected",
    { ar: "تم رفض الدفع", en: "Payment rejected" },
    { ar: reason, en: reason },
    "/billing"
  )
  return paymentSchema.parse(row)
})

const planInput = planSchema.omit({ id: true })
route(
  "GET",
  "/admin/plans",
  (c) => (
    admin(c),
    db.plans
      .map((p) => planSchema.parse(p))
      .sort((a, b) => a.sortOrder - b.sortOrder)
  )
)
route("POST", "/admin/plans", async (c) => {
  admin(c)
  return planSchema.parse(
    insert(db.plans, { id: newId("plan"), ...(await c.body(planInput)) })
  )
})
route("PATCH", "/admin/plans/:id", async (c) => {
  admin(c)
  const row = find(db.plans, c.params.id ?? "")
  if (!row) throw fail(404, "not_found")
  Object.assign(row, await c.body(planInput.partial()))
  return planSchema.parse(row)
})
route("DELETE", "/admin/plans/:id", (c) => {
  admin(c)
  if (db.subscriptions.some((s) => s.planId === c.params.id))
    throw fail(409, "in_use")
  if (!remove(db.plans, c.params.id ?? "")) throw fail(404, "not_found")
  return okSchema.parse({ ok: true })
})

route("GET", "/admin/subscriptions", (c) => {
  admin(c)
  const rows = db.subscriptions.map((s) => ({
    ...s,
    usage: { used: listingUsage(s.userId), limit: listingLimit(s.userId) },
  }))
  return pageOf(subscriptionSchema).parse(
    listPage(
      c,
      rows.sort((a, b) => b.startsAt.localeCompare(a.startsAt))
    )
  )
})

const priceInput = promotionPriceSchema
route(
  "GET",
  "/admin/promotion-prices",
  (c) => (
    admin(c),
    db.promotionPrices.map((p) => promotionPriceSchema.parse(p))
  )
)
route("POST", "/admin/promotion-prices", async (c) => {
  admin(c)
  const input = await c.body(priceInput)
  if (db.promotionPrices.some((p) => p.type === input.type))
    throw fail(409, "exists")
  return promotionPriceSchema.parse(
    insert(db.promotionPrices, { ...input, id: input.type })
  )
})
route("PATCH", "/admin/promotion-prices/:id", async (c) => {
  admin(c)
  const row = find(db.promotionPrices, c.params.id ?? "")
  if (!row) throw fail(404, "not_found")
  const { type: _type, ...patch } = await c.body(priceInput.partial())
  Object.assign(row, patch)
  return promotionPriceSchema.parse(row)
})
route("DELETE", "/admin/promotion-prices/:id", (c) => {
  admin(c)
  if (!remove(db.promotionPrices, c.params.id ?? ""))
    throw fail(404, "not_found")
  return okSchema.parse({ ok: true })
})

route(
  "GET",
  "/admin/promotions",
  (c) => (
    admin(c),
    pageOf(promotionSchema).parse(
      listPage(
        c,
        [...db.promotions].sort((a, b) => b.startsAt.localeCompare(a.startsAt))
      )
    )
  )
)
route("POST", "/admin/promotions/grant", async (c) => {
  admin(c)
  const { listingId, type, days } = await c.body(grantInputSchema)
  return promotionSchema.parse(
    addPromotion(listingId, type, days, "admin_grant")
  )
})

const audience = (a: string) =>
  db.users.filter(
    (u) => !u.banned && u.role !== "admin" && (a === "all" || u.role === a)
  )
route(
  "GET",
  "/admin/broadcasts",
  (c) => (
    admin(c),
    pageOf(broadcastSchema).parse(
      listPage(c, [...db.broadcasts].sort(byNewest))
    )
  )
)
route(
  "GET",
  "/admin/broadcasts/estimate",
  (c) => (
    admin(c),
    { recipients: audience(c.query.get("audience") ?? "all").length }
  )
)
route("POST", "/admin/broadcasts", async (c) => {
  admin(c)
  const input = await c.body(broadcastInputSchema)
  const users = audience(input.audience)
  for (const u of users)
    notify(
      u.id,
      "broadcast",
      { ar: input.title, en: input.title },
      { ar: input.body, en: input.body }
    )
  return broadcastSchema.parse(
    insert(db.broadcasts, {
      id: newId("bc"),
      ...input,
      recipients: users.length,
      createdAt: nowIso(),
    })
  )
})
