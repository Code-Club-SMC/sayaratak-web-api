import { okSchema } from "@/schemas/api"
import { bannerSchema, sitePageSchema } from "@/schemas/admin"
import { contactInputSchema } from "@/schemas/inputs"
import { z } from "zod"

import { db, insert, newId, resetDb } from "../db"
import { fail, route, withSession } from "../http"
import { nowIso } from "../lib"

route("GET", "/pages/:slug", (c) => {
  const row = db.pages.find((p) => p.slug === c.params.slug)
  if (!row) throw fail(404, "not_found")
  return sitePageSchema.parse(row)
})

route("GET", "/banners", (c) => {
  const placement = c.query.get("placement")
  const now = Date.now()
  const rows = db.banners
    .filter(
      (b) =>
        b.active &&
        Date.parse(b.startsAt) <= now &&
        Date.parse(b.endsAt) >= now &&
        (!placement || b.placement === placement)
    )
    .sort((a, b) => a.sortOrder - b.sortOrder)
  return z.array(bannerSchema).parse(rows)
})

route("POST", "/contact", async (c) => {
  const input = await c.body(contactInputSchema)
  insert(db.contacts, { id: newId("ct"), ...input, createdAt: nowIso() })
  return okSchema.parse({ ok: true })
})

// Reseeds (MOCK_EMPTY decides the data set) and signs everyone out.
route("POST", "/mock/reset", () => {
  resetDb()
  return withSession(null, { ok: true })
})
