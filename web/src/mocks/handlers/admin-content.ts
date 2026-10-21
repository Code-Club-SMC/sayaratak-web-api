import {
  backupSchema,
  bannerSchema,
  adminReportSchema,
  adminReviewSchema,
  settingsSchema,
  type Report,
  sitePageSchema,
} from "@/schemas/admin"
import { okSchema, taxonomyTypeSchema } from "@/schemas/api"
import {
  bilingualSchema,
  geoSchema,
  pageOf,
  type Bilingual,
} from "@/schemas/fields"
import {
  bannerInputSchema,
  noteInputSchema,
  pagePatchSchema,
  reportActionInputSchema,
} from "@/schemas/inputs"
import { vehicleTypeSchema } from "@/schemas/listing"
import { reviewSchema } from "@/schemas/review"
import { z } from "zod"

import { slugify } from "../seed/util"
import { db, find, insert, newId, remove } from "../db"
import { fail, needRole, route, type Ctx } from "../http"
import {
  byNewest,
  findBusiness,
  listPage,
  nowIso,
  notify,
  syncFreeLimit,
} from "../lib"
import { setBan } from "./admin"
import { recomputeRating } from "./reviews"

const admin = (c: Ctx) => needRole(c, "admin")
const ack = () => okSchema.parse({ ok: true })

// Filters: `status`, `targetType`, `rating` (exact stars) and `id` (one review, for a link). `q` matches the author, the text and the business name.
route("GET", "/admin/reviews", (c) => {
  admin(c)
  const q = (key: string) => c.query.get(key)
  const rows = db.reviews
    .filter(
      (r) =>
        (!q("id") || r.id === q("id")) &&
        (!q("status") || r.status === q("status")) &&
        (!q("targetType") || r.targetType === q("targetType")) &&
        (!q("rating") || r.rating === Number(q("rating")))
    )
    .sort(byNewest)
    .map((r) => {
      const target = findBusiness(r.targetId)
      return {
        ...r,
        target: target ? { name: target.name, slug: target.slug } : null,
      }
    })
  return pageOf(adminReviewSchema).parse(
    listPage(
      c,
      rows,
      (r) =>
        `${r.authorName} ${r.body ?? ""} ${r.target?.name.ar ?? ""} ${r.target?.name.en ?? ""}`
    )
  )
})
for (const [action, status] of [
  ["hide", "hidden"],
  ["show", "visible"],
] as const) {
  route("POST", `/admin/reviews/:id/${action}`, (c) => {
    admin(c)
    const row = find(db.reviews, c.params.id ?? "")
    if (!row) throw fail(404, "not_found")
    row.status = status
    recomputeRating(row.targetId)
    return reviewSchema.parse(row)
  })
}

// `status` is open or resolved (dismissed and actioned); `id` returns that one report, for a sheet opened from a link.
const reportRow = (r: Report) => {
  const listing = find(db.listings, r.listingId)
  const seller = listing && find(db.users, listing.ownerUserId)
  return {
    ...r,
    listing: listing ?? null,
    reporterName: find(db.users, r.reporterId)?.fullName ?? "",
    listingReports: db.reports.filter((o) => o.listingId === r.listingId)
      .length,
    sellerBanned: !!seller?.banned,
  }
}
route("GET", "/admin/reports", (c) => {
  admin(c)
  const status = c.query.get("status")
  const id = c.query.get("id")
  const rows = db.reports
    .filter((r) => !id || r.id === id)
    .filter(
      (r) =>
        !status ||
        (status === "resolved" ? r.status !== "open" : r.status === status)
    )
    .sort(byNewest)
    .map(reportRow)
  return pageOf(adminReportSchema).parse(
    listPage(c, rows, (r) => `${r.listing?.title ?? ""} ${r.reporterName}`)
  )
})
route("POST", "/admin/reports/:id/dismiss", async (c) => {
  admin(c)
  const row = find(db.reports, c.params.id ?? "")
  if (!row) throw fail(404, "not_found")
  row.status = "dismissed"
  row.resolutionNote = (await c.body(noteInputSchema)).note
  return adminReportSchema.parse(reportRow(row))
})
// Removes the listing and tells its owner, or (with `ban`) bans the owner and tells nobody. Every open report on the listing closes with the same note.
route("POST", "/admin/reports/:id/action", async (c) => {
  admin(c)
  const row = find(db.reports, c.params.id ?? "")
  if (!row) throw fail(404, "not_found")
  const { note, ban } = await c.body(reportActionInputSchema)
  const listing = find(db.listings, row.listingId)
  if (ban) {
    const seller = listing && find(db.users, listing.ownerUserId)
    if (!seller) throw fail(404, "not_found")
    if (seller.role === "admin") throw fail(403, "forbidden")
    setBan(seller, ban)
  } else if (listing) {
    listing.moderation = "removed"
    notify(
      listing.ownerUserId,
      "listing_rejected",
      { ar: "تمت إزالة إعلانك", en: "Your listing was removed" },
      { ar: listing.title, en: listing.title }
    )
  }
  for (const r of db.reports)
    if (r.listingId === row.listingId && (r === row || r.status === "open")) {
      r.status = "actioned"
      r.resolutionNote = note
    }
  return adminReportSchema.parse(reportRow(row))
})

// Taxonomy: one generic CRUD over the seven admin-managed lists.
type Loose = { id: string; [key: string]: unknown }
const name = bilingualSchema
const taxonomy: Record<
  z.infer<typeof taxonomyTypeSchema>,
  { rows: () => Loose[]; shape: z.ZodObject; useOf: (id: string) => boolean }
> = {
  cities: {
    rows: () => db.taxonomy.cities,
    shape: z.object({
      slug: z.string().min(1, "validation.required"),
      name,
      center: geoSchema,
    }),
    useOf: (id) => db.listings.some((l) => l.cityId === id),
  },
  districts: {
    rows: () => db.taxonomy.districts,
    shape: z.object({ cityId: z.string().min(1), name }),
    useOf: (id) => db.listings.some((l) => l.districtId === id),
  },
  makes: {
    rows: () => db.taxonomy.makes,
    shape: z.object({
      slug: z.string().min(1, "validation.required"),
      name,
      vehicleTypes: z.array(vehicleTypeSchema),
    }),
    useOf: (id) =>
      db.listings.some((l) => l.makeId === id) ||
      db.taxonomy.models.some((m) => m.makeId === id),
  },
  models: {
    rows: () => db.taxonomy.models,
    shape: z.object({ makeId: z.string().min(1), name }),
    useOf: (id) => db.listings.some((l) => l.modelId === id),
  },
  "vehicle-types": {
    rows: () => db.taxonomy.vehicleTypes,
    shape: z.object({ name, enabled: z.boolean() }),
    useOf: () => true,
  },
  "part-categories": {
    rows: () => db.taxonomy.partCategories,
    shape: z.object({ slug: z.string().min(1, "validation.required"), name }),
    useOf: (id) => db.listings.some((l) => l.partCategoryId === id),
  },
  countries: {
    rows: () => db.countries,
    shape: z.object({
      name,
      dialCode: z.string().regex(/^\+\d{1,4}$/, "validation.dial_code"),
    }),
    useOf: () => false,
  },
}
const kind = (c: Ctx) => {
  admin(c)
  const type = taxonomyTypeSchema.safeParse(c.params.type)
  if (!type.success) throw fail(404, "not_found")
  return { type: type.data, ...taxonomy[type.data] }
}
route("GET", "/admin/taxonomy/:type", (c) => kind(c).rows())
route("POST", "/admin/taxonomy/:type", async (c) => {
  const { type, rows, shape } = kind(c)
  if (type === "vehicle-types") throw fail(403, "forbidden")
  // A part category's slug comes from its English name, with a number added when taken.
  const input = await c.body(
    type === "part-categories"
      ? shape.extend({ slug: z.string().optional() })
      : shape
  )
  if (type === "part-categories") {
    const base = slugify((input.name as Bilingual).en) || "category"
    let slug = base
    for (let n = 2; rows().some((r) => r.id === slug); n++)
      slug = `${base}-${n}`
    input.slug = slug
  }
  const id =
    typeof input.slug === "string" ? input.slug : newId(type.slice(0, 3))
  if (rows().some((r) => r.id === id)) throw fail(409, "exists")
  return insert(rows(), { id, ...input })
})
route("DELETE", "/admin/taxonomy/:type/:id", (c) => {
  const { type, rows, useOf } = kind(c)
  if (type === "vehicle-types") throw fail(403, "forbidden")
  if (useOf(c.params.id ?? "")) throw fail(409, "in_use")
  if (!remove(rows(), c.params.id ?? "")) throw fail(404, "not_found")
  return ack()
})
route("PATCH", "/admin/taxonomy/:type/:id", async (c) => {
  const { type, rows, shape } = kind(c)
  const row = find(rows(), c.params.id ?? "")
  if (!row) throw fail(404, "not_found")
  const input = await c.body(shape.partial())
  // The site always shows at least one vehicle type.
  if (
    type === "vehicle-types" &&
    input.enabled === false &&
    !rows().some((r) => r !== row && r.enabled)
  )
    throw fail(409, "last_shown")
  return Object.assign(row, input)
})

route(
  "GET",
  "/admin/banners",
  (c) => (
    admin(c),
    z
      .array(bannerSchema)
      .parse([...db.banners].sort((a, b) => a.sortOrder - b.sortOrder))
  )
)
route("POST", "/admin/banners", async (c) => {
  admin(c)
  return bannerSchema.parse(
    insert(db.banners, {
      id: newId("bn"),
      ...(await c.body(bannerInputSchema)),
      impressions: 0,
      clicks: 0,
    })
  )
})
route("PATCH", "/admin/banners/:id", async (c) => {
  admin(c)
  const row = find(db.banners, c.params.id ?? "")
  if (!row) throw fail(404, "not_found")
  Object.assign(row, await c.body(bannerInputSchema.partial()))
  return bannerSchema.parse(row)
})
route("DELETE", "/admin/banners/:id", (c) => {
  admin(c)
  if (!remove(db.banners, c.params.id ?? "")) throw fail(404, "not_found")
  return ack()
})

route("GET", "/admin/pages/:slug", (c) => {
  admin(c)
  const row = db.pages.find((p) => p.slug === c.params.slug)
  if (!row) throw fail(404, "not_found")
  return sitePageSchema.parse(row)
})
route("PATCH", "/admin/pages/:slug", async (c) => {
  admin(c)
  const row = db.pages.find((p) => p.slug === c.params.slug)
  if (!row) throw fail(404, "not_found")
  Object.assign(row, await c.body(pagePatchSchema), { updatedAt: nowIso() })
  return sitePageSchema.parse(row)
})

route(
  "GET",
  "/admin/settings",
  (c) => (admin(c), settingsSchema.parse(db.settings))
)
route("PATCH", "/admin/settings", async (c) => {
  admin(c)
  Object.assign(db.settings, await c.body(settingsSchema.partial()))
  syncFreeLimit()
  return settingsSchema.parse(db.settings)
})

route(
  "GET",
  "/admin/backups",
  (c) => (admin(c), z.array(backupSchema).parse([...db.backups].sort(byNewest)))
)
route("POST", "/admin/backups", (c) => {
  admin(c)
  return backupSchema.parse(
    insert(db.backups, {
      id: newId("bk"),
      createdAt: nowIso(),
      sizeMb: 40 + db.backups.length,
      type: "manual",
      status: "ready",
    })
  )
})
// The mock keeps one live data set, so a restore only confirms the backup exists.
route("POST", "/admin/backups/:id/restore", (c) => {
  admin(c)
  if (!find(db.backups, c.params.id ?? "")) throw fail(404, "not_found")
  return ack()
})
