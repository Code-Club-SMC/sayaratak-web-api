import { promotionInputSchema } from "@/schemas/inputs"
import { pageOf } from "@/schemas/fields"
import {
  paymentSchema,
  planSchema,
  promotionPriceSchema,
  promotionSchema,
} from "@/schemas/billing"
import {
  checkoutSchema,
  meSubscriptionSchema,
  myPromotionsSchema,
} from "@/schemas/responses"
import { z } from "zod"

import { db, find, insert, newId, paginate } from "../db"
import { fail, needUser, pageParams, route } from "../http"
import {
  byNewest,
  currentSubscription,
  listingById,
  listingLimit,
  listingUsage,
  nowIso,
  paymentReference,
  promotionPrice,
  promotionView,
} from "../lib"
import type { UserRow } from "../types"
import { storeUpload } from "./uploads"

// Enabled plans only. Individuals have none while individual subscriptions are off.
route("GET", "/plans", (c) => {
  const audience = c.query.get("audience")
  return z
    .array(planSchema)
    .parse(
      db.plans
        .filter(
          (p) =>
            p.enabled &&
            (!audience || p.audience === audience) &&
            (p.audience !== "user" ||
              db.settings.individualSubscriptionsEnabled)
        )
        .sort((a, b) => a.sortOrder - b.sortOrder)
    )
})

// The active subscription (else the pending one), its plan, and how much of the limit is used. No subscription means null: an individual then runs on the free limit.
route("GET", "/me/subscription", (c) => {
  const user = needUser(c)
  const sub = currentSubscription(user.id)
  const used = listingUsage(user.id)
  return meSubscriptionSchema.parse({
    subscription: sub
      ? { ...sub, usage: { used, limit: sub.usage.limit } }
      : null,
    plan: sub ? (find(db.plans, sub.planId) ?? null) : null,
    usage: { used, limit: listingLimit(user.id) },
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
  db.payments.find(
    (p) =>
      p.userId === userId &&
      p.itemId === itemId &&
      p.status === "pending_review"
  )

// What a payment is for: a plan, or an unpaid promotion of one of the payer's listings.
function itemFor(
  user: UserRow,
  itemType: "plan" | "promotion",
  itemId: string
) {
  if (itemType === "plan") {
    const plan = find(db.plans, itemId)
    if (!plan) throw fail(404, "not_found")
    return {
      label: plan.name,
      amount: plan.price,
      durationDays: plan.durationDays,
    }
  }
  const promo = find(db.promotions, itemId)
  if (!promo) throw fail(404, "not_found")
  const listing = listingById(promo.listingId)
  if (listing.ownerUserId !== user.id) throw fail(403, "forbidden")
  if (promo.status !== "pending_payment") throw fail(409, "exists")
  return {
    label: { ar: listing.title, en: listing.title },
    amount: promotionPrice(promo.type)?.price ?? 0,
    durationDays: promo.durationDays,
  }
}

// multipart: itemType, itemId (a plan id or a promotion id), transactionRef, payerName, receipt (image, up to 5 MB).
route("POST", "/payments", async (c) => {
  const user = needUser(c)
  const form = await c.form()
  const itemType = form.get("itemType")
  const itemId = String(form.get("itemId") ?? "")
  const transactionRef = String(form.get("transactionRef") ?? "").trim()
  const payerName = String(form.get("payerName") ?? "").trim()
  const receipt = form.get("receipt")
  const fields: Record<string, string> = {}
  if (itemType !== "plan" && itemType !== "promotion")
    fields.itemType = "validation.required"
  if (payerName.length < 2) fields.payerName = "validation.name_min"
  if (transactionRef.length < 4) fields.transactionRef = "validation.txn_min"
  if (!(receipt instanceof File)) fields.receipt = "validation.required"
  if (
    Object.keys(fields).length ||
    !(receipt instanceof File) ||
    (itemType !== "plan" && itemType !== "promotion")
  )
    throw fail(422, "validation", fields)
  const item = itemFor(user, itemType, itemId)
  if (pendingFor(user.id, itemId)) throw fail(409, "payment_pending")
  const upload = await storeUpload(receipt)
  const row = insert(db.payments, {
    id: newId("pay"),
    userId: user.id,
    itemType,
    itemId,
    itemLabel: item.label,
    amount: item.amount,
    method: "bankak_transfer" as const,
    reference: paymentReference(user.id, itemId),
    payerName,
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

// A promotion starts as `pending_payment`; the admin's approval of its payment starts it. Asking again for the same listing and type returns the unpaid one.
route("POST", "/promotions", async (c) => {
  const user = needUser(c)
  const { listingId, type } = await c.body(promotionInputSchema)
  const listing = listingById(listingId)
  if (listing.ownerUserId !== user.id) throw fail(403, "forbidden")
  const price = promotionPrice(type)
  if (!price) throw fail(404, "not_found")
  const unpaid = db.promotions.find(
    (p) =>
      p.listingId === listingId &&
      p.type === type &&
      p.status === "pending_payment"
  )
  return promotionSchema.parse(
    unpaid ??
      insert(db.promotions, {
        id: newId("promo"),
        listingId,
        type,
        status: "pending_payment" as const,
        durationDays: price.durationDays,
        source: "paid" as const,
      })
  )
})

route("GET", "/me/promotions", (c) => {
  const user = needUser(c)
  const mine = new Set(
    db.listings.filter((l) => l.ownerUserId === user.id).map((l) => l.id)
  )
  const items = db.promotions
    .filter((p) => mine.has(p.listingId))
    .map(promotionView)
    // Waiting ones first, then the newest start.
    .sort((a, b) => (b.startsAt ?? "9").localeCompare(a.startsAt ?? "9"))
  return myPromotionsSchema.parse({ items })
})

// `item` is `plan:<planId>` or `promotion:<promotionId>`.
route("GET", "/checkout", (c) => {
  const user = needUser(c)
  const [itemType, itemId = ""] = (c.query.get("item") ?? "").split(":")
  if (itemType !== "plan" && itemType !== "promotion")
    throw fail(404, "not_found")
  const item = itemFor(user, itemType, itemId)
  return checkoutSchema.parse({
    itemType,
    itemId,
    itemLabel: item.label,
    amount: item.amount,
    durationDays: item.durationDays,
    reference: paymentReference(user.id, itemId),
    bankak: db.settings.bankakAccount,
    pendingPaymentId: pendingFor(user.id, itemId)?.id ?? null,
  })
})
