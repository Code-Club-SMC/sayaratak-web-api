import { reportInputSchema, verificationInputSchema } from "@/schemas/inputs"
import { reportSchema, verificationRequestSchema } from "@/schemas/admin"

import { db, insert, newId } from "../db"
import { fail, needRole, needUser, route } from "../http"
import { businessOf, listingById, nowIso } from "../lib"

route("POST", "/reports", async (c) => {
  const user = needUser(c)
  const input = await c.body(reportInputSchema)
  listingById(input.listingId)
  if (input.reason === "other" && !input.details)
    throw fail(422, "validation", { details: "validation.details_required" })
  return reportSchema.parse(
    insert(db.reports, {
      id: newId("rp"),
      listingId: input.listingId,
      reporterId: user.id,
      reason: input.reason,
      details: input.details,
      status: "open",
      createdAt: nowIso(),
    })
  )
})

const latest = (ownerId: string) =>
  db.verifications
    .filter((v) => v.ownerId === ownerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

route("POST", "/me/verification", async (c) => {
  const user = needRole(c, "dealership", "workshop", "mechanic")
  const input = await c.body(verificationInputSchema)
  const biz = businessOf(user)
  if (!biz?.row) throw fail(404, "not_found")
  if (latest(user.id)?.status === "pending") throw fail(409, "payment_pending")
  return verificationRequestSchema.parse(
    insert(db.verifications, {
      id: newId("vr"),
      targetType: biz.type,
      targetId: biz.row.id,
      ownerId: user.id,
      documents: input.documents.map((d) => ({ id: newId("doc"), ...d })),
      note: input.note,
      status: "pending" as const,
      createdAt: nowIso(),
    })
  )
})
route("GET", "/me/verification", (c) => {
  const row = latest(needUser(c).id)
  return row ? verificationRequestSchema.parse(row) : null
})
