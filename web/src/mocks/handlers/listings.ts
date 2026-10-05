import { searchParamsSchema } from "@/features/search/schemas"
import { analyticsSchema } from "@/schemas/api"
import {
  listingCreateSchema,
  listingPatchSchema,
  listingStatusInputSchema,
} from "@/schemas/inputs"
import { listingPageSchema, listingSchema } from "@/schemas/listing"
import { taxonomySchema } from "@/schemas/taxonomy"
import { makeListingSlug, parseListingId } from "@/lib/slug"

import { db, find, insert, newListingId, paginate, remove } from "../db"
import {
  fail,
  needRole,
  needUser,
  pageParams,
  queryObject,
  route,
} from "../http"
import {
  DAY_MS,
  byNewest,
  canEditListing,
  eventSeries,
  listingById,
  listingLimit,
  listingUsage,
  nowIso,
  rangeDays,
} from "../lib"
import { facets, matches, sortListings } from "../search"
import type { ListingRow, UserRow } from "../types"

const owned = (l: ListingRow) => listingSchema.parse(l)
const page = (rows: ListingRow[], p: number, size = 24) => ({
  ...paginate(rows, p, size),
  items: paginate(rows, p, size).items.map(owned),
})

route("GET", "/taxonomy", () => taxonomySchema.parse(db.taxonomy))

route("GET", "/listings", (c) => {
  const params = searchParamsSchema.parse(
    queryObject(c.query, ["fuel", "transmission"])
  )
  const rows = sortListings(
    db.listings.filter((l) => matches(l, params)),
    params
  )
  return listingPageSchema.parse({
    ...page(rows, params.page),
    facets: facets(params),
  })
})

// Not-yet-approved listings are visible to their owner and to admins only.
route("GET", "/listings/:slug", (c) => {
  const row = find(db.listings, parseListingId(c.params.slug ?? ""))
  if (
    !row ||
    (row.moderation !== "approved" &&
      c.user?.id !== row.ownerUserId &&
      c.user?.role !== "admin")
  )
    throw fail(404, "not_found")
  return owned(row)
})

route("GET", "/listings/:id/similar", (c) => {
  const row = listingById(c.params.id ?? "")
  const similar = db.listings
    .filter(
      (l) =>
        l.id !== row.id &&
        l.moderation === "approved" &&
        l.status === "available" &&
        l.kind === row.kind &&
        l.intent === row.intent &&
        l.vehicleType === row.vehicleType
    )
    .sort(
      (a, b) => Math.abs(a.price - row.price) - Math.abs(b.price - row.price)
    )
    .slice(0, 8)
  return similar.map(owned)
})

// Verified dealers skip review when the admin setting is on.
const publishState = (
  user: UserRow,
  submit: boolean
): ListingRow["moderation"] => {
  if (!submit) return "draft"
  const dealer = db.dealerships.find((d) => d.ownerId === user.id)
  return db.settings.autoApproveVerifiedDealers && dealer?.verified
    ? "approved"
    : "pending"
}

route("POST", "/listings", async (c) => {
  const user = needRole(c, "user", "dealership")
  const input = await c.body(listingCreateSchema)
  const limit = listingLimit(user.id)
  if (input.submit && limit !== null && listingUsage(user.id) >= limit)
    throw fail(403, "limit_reached")
  const city = db.taxonomy.cities.find((x) => x.id === input.cityId)
  if (!city) throw fail(422, "validation", { cityId: "validation.required" })
  const dealer = db.dealerships.find((d) => d.ownerId === user.id)
  const id = newListingId()
  const phone = input.contact?.phone ?? user.phone ?? dealer?.phones[0] ?? ""
  const now = nowIso()
  const row: ListingRow = {
    id,
    slug: makeListingSlug(input.title, city.id, id),
    kind: input.kind ?? "vehicle",
    intent: input.intent ?? "sale",
    vehicleType: input.vehicleType ?? null,
    title: input.title,
    description: input.description ?? "",
    price: input.price,
    negotiable: input.negotiable ?? false,
    rentPeriod: input.rentPeriod ?? null,
    condition: input.condition ?? "used",
    makeId: input.makeId ?? null,
    modelId: input.modelId ?? null,
    makeOther: input.makeOther ?? null,
    modelOther: input.modelOther ?? null,
    year: input.year ?? null,
    mileageKm: input.mileageKm ?? null,
    fuel: input.fuel ?? null,
    transmission: input.transmission ?? null,
    color: input.color ?? null,
    engineCc: input.engineCc ?? null,
    payloadTons: input.payloadTons ?? null,
    partCategoryId: input.partCategoryId ?? null,
    compatibleTypes: input.compatibleTypes ?? [],
    media: input.media ?? [],
    cityId: city.id,
    districtId: input.districtId ?? null,
    location: input.location ?? null,
    status: "available",
    moderation: publishState(user, input.submit ?? false),
    rejectionReason: null,
    promotions: [],
    owner: dealer
      ? {
          id: dealer.id,
          type: "dealership",
          name: dealer.name,
          avatarUrl: dealer.logoUrl,
          verified: dealer.verified,
          memberSince: dealer.createdAt,
          profileSlug: dealer.slug,
        }
      : {
          id: user.id,
          type: "user",
          name: user.fullName,
          avatarUrl: user.avatarUrl ?? null,
          verified: user.verifiedPhone,
          memberSince: user.createdAt,
          profileSlug: null,
        },
    ownerUserId: user.id,
    contact: {
      phone,
      whatsapp: input.contact?.whatsapp ?? null,
      showPhone: input.contact?.showPhone ?? true,
      methods: input.contact?.methods ?? ["call", "chat"],
    },
    stats: { views: 0, favorites: 0, phoneClicks: 0, whatsappClicks: 0 },
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(
      Date.now() + db.settings.listingExpiryDays * DAY_MS
    ).toISOString(),
  }
  insert(db.listings, row)
  return owned(row)
})

route("PATCH", "/listings/:id", async (c) => {
  const user = needUser(c)
  const row = listingById(c.params.id ?? "")
  canEditListing(user, row)
  const { submit, moderation, ...patch } = await c.body(listingPatchSchema)
  if (moderation && user.role !== "admin") throw fail(403, "forbidden")
  if (patch.contact) row.contact = { ...row.contact, ...patch.contact }
  const { contact: _contact, ...fields } = patch
  Object.assign(row, fields)
  if (patch.title || patch.cityId)
    row.slug = makeListingSlug(row.title, row.cityId, row.id)
  if (moderation) row.moderation = moderation
  if (submit && (row.moderation === "draft" || row.moderation === "rejected")) {
    const limit = listingLimit(row.ownerUserId)
    if (limit !== null && listingUsage(row.ownerUserId) >= limit)
      throw fail(403, "limit_reached")
    row.moderation = publishState(user, true)
    row.rejectionReason = null
  }
  row.updatedAt = nowIso()
  return owned(row)
})

route("DELETE", "/listings/:id", (c) => {
  const user = needUser(c)
  const row = listingById(c.params.id ?? "")
  canEditListing(user, row)
  remove(db.listings, row.id)
  db.favorites = db.favorites.filter((f) => f.listingId !== row.id)
  return undefined
})

route("POST", "/listings/:id/status", async (c) => {
  const user = needUser(c)
  const row = listingById(c.params.id ?? "")
  canEditListing(user, row)
  row.status = (await c.body(listingStatusInputSchema)).status
  row.updatedAt = nowIso()
  return owned(row)
})

route("POST", "/listings/:id/renew", (c) => {
  const user = needUser(c)
  const row = listingById(c.params.id ?? "")
  canEditListing(user, row)
  row.expiresAt = new Date(
    Date.now() + db.settings.listingExpiryDays * DAY_MS
  ).toISOString()
  row.updatedAt = nowIso()
  return owned(row)
})

route("POST", "/listings/:id/duplicate", (c) => {
  const user = needUser(c)
  const row = listingById(c.params.id ?? "")
  canEditListing(user, row)
  const id = newListingId()
  const now = nowIso()
  const copy: ListingRow = {
    ...structuredClone(row),
    id,
    slug: makeListingSlug(row.title, row.cityId, id),
    moderation: "draft",
    status: "available",
    rejectionReason: null,
    promotions: [],
    stats: { views: 0, favorites: 0, phoneClicks: 0, whatsappClicks: 0 },
    createdAt: now,
    updatedAt: now,
  }
  insert(db.listings, copy)
  return owned(copy)
})

route("GET", "/me/listings", (c) => {
  const user = needRole(c, "user", "dealership")
  const q = c.query.get("q")?.toLowerCase()
  const moderation = c.query.get("moderation")
  const status = c.query.get("status")
  const attention = c.query.get("needsAttention") === "true"
  const now = Date.now()
  const rows = db.listings
    .filter((l) => l.ownerUserId === user.id)
    .filter((l) => !q || l.title.toLowerCase().includes(q))
    .filter((l) => !moderation || l.moderation === moderation)
    .filter((l) => !status || l.status === status)
    .filter(
      (l) =>
        !attention ||
        l.moderation === "rejected" ||
        (l.moderation === "approved" &&
          (Date.parse(l.expiresAt) - now < 7 * DAY_MS ||
            (l.status === "reserved" &&
              now - Date.parse(l.updatedAt) >= 14 * DAY_MS)))
    )
    .sort(byNewest)
  const { page: p, pageSize } = pageParams(c.query, 20)
  return {
    ...paginate(rows, p, pageSize),
    items: paginate(rows, p, pageSize).items.map(owned),
  }
})

route("GET", "/listings/:id/analytics", (c) => {
  const user = needUser(c)
  const row = listingById(c.params.id ?? "")
  canEditListing(user, row)
  const days = rangeDays(c.query)
  const series = eventSeries((id) => id === row.id, days)
  const sum = (key: "views" | "phoneClicks" | "whatsappClicks" | "shares") =>
    series.reduce((s, d) => s + d[key], 0)
  return analyticsSchema.parse({
    range: `${days}d`,
    totals: {
      views: sum("views"),
      phoneClicks: sum("phoneClicks"),
      whatsappClicks: sum("whatsappClicks"),
      shares: sum("shares"),
      favorites: row.stats.favorites,
    },
    series,
    top: [],
  })
})
