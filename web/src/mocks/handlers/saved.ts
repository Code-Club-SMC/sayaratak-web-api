import { okSchema } from "@/schemas/api"
import {
  favoriteInputSchema,
  savedSearchInputSchema,
  savedSearchPatchSchema,
} from "@/schemas/inputs"
import { listingSchema } from "@/schemas/listing"
import { pageOf } from "@/schemas/fields"
import { savedSearchSchema } from "@/schemas/saved-search"
import { z } from "zod"

import { db, find, insert, newId, paginate } from "../db"
import { fail, needUser, pageParams, route } from "../http"
import { nowIso } from "../lib"

const favoriteListings = (userId: string) =>
  db.favorites
    .filter((f) => f.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((f) => db.listings.filter((l) => l.id === f.listingId))

route("GET", "/favorites", (c) => {
  const user = needUser(c)
  const { page, pageSize } = pageParams(c.query, 24)
  return pageOf(listingSchema).parse(
    paginate(favoriteListings(user.id), page, pageSize)
  )
})
// Ids only, so every card can draw its heart without loading the full list.
route("GET", "/favorites/ids", (c) =>
  z
    .array(z.string())
    .parse(
      db.favorites
        .filter((f) => f.userId === needUser(c).id)
        .map((f) => f.listingId)
    )
)

route("POST", "/favorites", async (c) => {
  const user = needUser(c)
  const { listingId } = await c.body(favoriteInputSchema)
  const listing = find(db.listings, listingId)
  if (!listing) throw fail(404, "not_found")
  if (
    !db.favorites.some((f) => f.userId === user.id && f.listingId === listingId)
  ) {
    insert(db.favorites, {
      id: newId("f"),
      userId: user.id,
      listingId,
      createdAt: nowIso(),
    })
    listing.stats.favorites += 1
  }
  return okSchema.parse({ ok: true })
})
const unfavorite = (userId: string, listingId: string) => {
  const before = db.favorites.length
  db.favorites = db.favorites.filter(
    (f) => !(f.userId === userId && f.listingId === listingId)
  )
  const listing = find(db.listings, listingId)
  if (listing && db.favorites.length < before)
    listing.stats.favorites = Math.max(0, listing.stats.favorites - 1)
  return okSchema.parse({ ok: true })
}
route("DELETE", "/favorites/:listingId", (c) =>
  unfavorite(needUser(c).id, c.params.listingId ?? "")
)
route("DELETE", "/favorites", (c) =>
  unfavorite(needUser(c).id, c.query.get("listingId") ?? "")
)

const savedOf = (userId: string, id: string) => {
  const row = find(db.savedSearches, id)
  if (!row || row.userId !== userId) throw fail(404, "not_found")
  return row
}
route("GET", "/saved-searches", (c) =>
  z
    .array(savedSearchSchema)
    .parse(db.savedSearches.filter((s) => s.userId === needUser(c).id))
)
route("POST", "/saved-searches", async (c) => {
  const user = needUser(c)
  const input = await c.body(savedSearchInputSchema)
  const row = {
    id: newId("ss"),
    userId: user.id,
    name: input.name,
    params: input.params,
    alerts: input.alerts,
    newCount: 0,
    createdAt: nowIso(),
  }
  insert(db.savedSearches, row)
  return savedSearchSchema.parse(row)
})
route("PATCH", "/saved-searches/:id", async (c) => {
  const row = savedOf(needUser(c).id, c.params.id ?? "")
  const { markSeen, ...patch } = await c.body(savedSearchPatchSchema)
  Object.assign(row, patch)
  if (markSeen) row.newCount = 0
  return savedSearchSchema.parse(row)
})
route("DELETE", "/saved-searches/:id", (c) => {
  const row = savedOf(needUser(c).id, c.params.id ?? "")
  db.savedSearches = db.savedSearches.filter((s) => s.id !== row.id)
  return okSchema.parse({ ok: true })
})
