import { promotionInputSchema } from "@/schemas/inputs"
import { pageOf } from "@/schemas/fields"
import {
  paymentSchema,
  planSchema,
  promotionPriceSchema,
  promotionSchema,
  subscriptionSchema,
} from "@/schemas/billing"
import { z } from "zod"

import { db, find, insert, newId, paginate } from "../db"
import { fail, needUser, pageParams, route } from "../http"
import {
  byNewest,
  listingById,
  listingLimit,
  listingUsage,
  nowIso,
} from "../lib"
import { storeUpload } from "./uploads"

route("GET", "/plans", (c) => {
  const audience = c.query.get("audience")
  return z
    .array(planSchema)
    .parse(
      db.plans
        .filter((p) => p.enabled && (!audience || p.audience === audience))
        .sort((a, b) => a.sortOrder - b.sortOrder)
    )
})

// No row means the free plan; usage counts the listings that are live now.
route("GET", "/me/subscription", (c) => {
  const user = needUser(c)
  const sub = db.subscriptions
    .filter((s) => s.userId === user.id)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0]
  const free = db.plans.find((p) => p.audience === "user" && p.price === 0)
  const base = sub ?? {
    id: `sub-free-${user.id}`,
    userId: user.id,
    planId: free?.id ?? "",
    status: "active" as const,
    startsAt: user.createdAt,
    endsAt: new Date(Date.now() + 365 * 86_400_000).toISOString(),
  }
  return subscriptionSchema.parse({
    ...base,
    usage: { used: listingUsage(user.id), limit: listingLimit(user.id) },
  })
})

route("GET", "/me/payments", (c) => {
  const user = needUser(c)
  const { page, pageSize } = pageParams(c.query, 20)
  return pageOf(paymentSchema).parse(
    paginate(
      db.payments.filter((p) => p.userId === user.id).sort(byNewest),
      page,
      pageSize
    )
  )
})

const pendingFor = (userId: string, itemId: string) =>
  db.payments.some(
    (p) =>
      p.userId === userId &&
      p.itemId === itemId &&
      p.status === "pending_review"
  )
const reference = () =>
  `SY-${String(Math.floor(100_000 + Math.random() * 900_000))}`

// multipart: itemType, itemId, transactionRef, receipt (image, up to 5 MB).
route("POST", "/payments", async (c) => {
  const user = needUser(c)
  const form = await c.form()
  const itemType = form.get("itemType")
  const itemId = String(form.get("itemId") ?? "")
  const transactionRef = String(form.get("transactionRef") ?? "").trim()
  const receipt = form.get("receipt")
  const fields: Record<string, string> = {}
  if (itemType !== "plan" && itemType !== "promotion")
    fields.itemType = "validation.required"
  if (transactionRef.length < 6) fields.transactionRef = "validation.txn_min"
  if (!(receipt instanceof File)) fields.receipt = "validation.required"
  if (
    Object.keys(fields).length ||
    !(receipt instanceof File) ||
    (itemType !== "plan" && itemType !== "promotion")
  )
    throw fail(422, "validation", fields)
  const plan = itemType === "plan" ? find(db.plans, itemId) : undefined
  const promo =
    itemType === "promotion"
      ? db.promotionPrices.find((p) => p.type === itemId.split(":")[1])
      : undefined
  if (!plan && !promo) throw fail(404, "not_found")
  if (pendingFor(user.id, itemId)) throw fail(409, "payment_pending")
  const upload = await storeUpload(receipt)
  const row = insert(db.payments, {
    id: newId("pay"),
    userId: user.id,
    itemType,
    itemId,
    itemLabel: plan?.name.ar ?? promo?.type ?? "",
    amount: plan?.price ?? promo?.price ?? 0,
    method: "bankak_transfer" as const,
    reference: reference(),
    transactionRef,
    receiptUrl: upload.url,
    status: "pending_review" as const,
    createdAt: nowIso(),
  })
  return paymentSchema.parse(row)
})

route("GET", "/promotion-prices", () =>
  z.array(promotionPriceSchema).parse(db.promotionPrices)
)

// A promotion starts as a pending payment; approval (admin) adds the promotion row.
route("POST", "/promotions", async (c) => {
  const user = needUser(c)
  const { listingId, type } = await c.body(promotionInputSchema)
  const listing = listingById(listingId)
  if (listing.ownerUserId !== user.id) throw fail(403, "forbidden")
  const price = db.promotionPrices.find((p) => p.type === type)
  if (!price) throw fail(404, "not_found")
  const itemId = `${listingId}:${type}`
  if (pendingFor(user.id, itemId)) throw fail(409, "payment_pending")
  const row = insert(db.payments, {
    id: newId("pay"),
    userId: user.id,
    itemType: "promotion" as const,
    itemId,
    itemLabel: listing.title,
    amount: price.price,
    method: "bankak_transfer" as const,
    reference: reference(),
    transactionRef: "",
    receiptUrl: "",
    status: "pending_review" as const,
    createdAt: nowIso(),
  })
  return paymentSchema.parse(row)
})

route("GET", "/me/promotions", (c) => {
  const user = needUser(c)
  const mine = new Set(
    db.listings.filter((l) => l.ownerUserId === user.id).map((l) => l.id)
  )
  const rows = db.promotions
    .filter((p) => mine.has(p.listingId))
    .map((p) => ({
      ...p,
      state:
        Date.parse(p.endsAt) < Date.now()
          ? "ended"
          : Date.parse(p.startsAt) > Date.now()
            ? "scheduled"
            : "active",
    }))
  return z
    .array(
      promotionSchema.extend({
        state: z.enum(["active", "scheduled", "ended"]),
      })
    )
    .parse(rows)
})
