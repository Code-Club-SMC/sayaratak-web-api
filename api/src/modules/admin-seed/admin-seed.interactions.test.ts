import { beforeEach, expect, test } from "bun:test"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { listingSchema } from "@sayaratak/shared/schemas/listing"
import { dealershipSchema } from "@sayaratak/shared/schemas/profile"
import {
  mapResponseSchema,
  siteSchema,
  sitemapEntrySchema,
} from "@sayaratak/shared/schemas/responses"

import { db } from "~/shared/db/client"
import { dealerships } from "~/modules/businesses/businesses.tables"
import { favorites } from "~/modules/favorites/favorites.tables"
import { listings, listingStats } from "~/modules/listings/listings.tables"

import { seedPreviewFixture } from "../../../tests/admin-seed"
import { call, req, resetDb, signIn } from "../../../tests/helpers"

beforeEach(resetDb)

test("a signed-in user cannot save a preview listing", async () => {
  const { listingId } = await seedPreviewFixture()
  const viewer = await signIn("user")
  const response = await call(viewer, "/favorites", {
    method: "POST",
    body: { listingId },
  })
  expect(response.status).toBe(403)
})

test("preview targets refuse new messages reviews reports and admin promotion grants", async () => {
  const { listingId, businessId } = await seedPreviewFixture()
  const viewer = await signIn("user")
  for (const [path, body] of [
    [
      "/threads",
      { subjectType: "listing", subjectId: listingId, body: "Hello" },
    ],
    [
      "/threads",
      { subjectType: "dealership", subjectId: businessId, body: "Hello" },
    ],
    ["/reviews", { targetType: "dealership", targetId: businessId, rating: 5 }],
    ["/reports", { listingId, reason: "scam" }],
  ] as const)
    expect((await call(viewer, path, { method: "POST", body })).status).toBe(
      403
    )
  const admin = await signIn("admin")
  expect(
    (
      await call(admin, "/admin/promotions/grant", {
        method: "POST",
        body: { listingId, type: "featured", days: 7 },
      })
    ).status
  ).toBe(403)
})

test("preview public responses expose withheld contact and mode but never synthetic owner identities", async () => {
  const { listingId, businessId } = await seedPreviewFixture()
  const listing = listingSchema.parse(
    await (await req(`/listings/${listingId}`)).json()
  )
  expect(listing.interactionMode).toBe("preview")
  expect(listing.contact).toEqual({
    phone: null,
    whatsapp: null,
    showPhone: false,
    methods: [],
  })
  expect(listing.owner.id).toBe(businessId)
  const [businessRow] = await db
    .select()
    .from(dealerships)
    .where(eq(dealerships.id, businessId))
  const business = dealershipSchema.parse(
    await (await req(`/dealerships/${businessRow?.slug}`)).json()
  )
  expect(business.interactionMode).toBe("preview")
  expect(business.phones).toEqual([])
  expect(business.whatsapp).toBeNull()
  expect(business.ownerId).toBe(businessId)
  expect(JSON.stringify({ listing, business })).not.toContain("seedDatasetId")
  expect(JSON.stringify({ listing, business })).not.toContain("@seed.invalid")
  const sitemap = z
    .array(sitemapEntrySchema)
    .parse(await (await req("/sitemap")).json())
  expect(
    sitemap.some(
      (entry) =>
        entry.path.includes(listing.slug) || entry.path.endsWith(business.slug)
    )
  ).toBe(false)
})

test("hidden previews disappear from public reads map inventory and site state while old favorites remain removable", async () => {
  const { listingId, businessId } = await seedPreviewFixture()
  const viewer = await signIn("user")
  await db
    .insert(favorites)
    .values({ userId: "u-omar", listingId, createdAt: new Date() })
  await db
    .update(listings)
    .set({ lat: 15.5, lng: 32.5 })
    .where(eq(listings.id, listingId))
  await db
    .update(dealerships)
    .set({ lat: 15.5, lng: 32.5 })
    .where(eq(dealerships.id, businessId))
  const map = mapResponseSchema.parse(
    await (
      await req("/map?bbox=32,15,33,16&layers=vehicles&layers=dealerships")
    ).json()
  )
  expect(map.items.find((item) => item.id === listingId)?.interactionMode).toBe(
    "preview"
  )
  expect(
    map.items.find((item) => item.id === businessId)?.interactionMode
  ).toBe("preview")
  expect(siteSchema.parse(await (await req("/site")).json()).demoActive).toBe(
    true
  )
  await db
    .update(listings)
    .set({ seedHidden: true })
    .where(eq(listings.id, listingId))
  await db
    .update(dealerships)
    .set({ seedHidden: true })
    .where(eq(dealerships.id, businessId))
  expect((await req(`/listings/${listingId}`)).status).toBe(404)
  const site = await req("/site")
  expect(site.headers.get("cache-control")).toBe("no-store")
  expect(siteSchema.parse(await site.json()).demoActive).toBe(false)
  const hiddenMap = mapResponseSchema.parse(
    await (
      await req("/map?bbox=32,15,33,16&layers=vehicles&layers=dealerships")
    ).json()
  )
  expect(
    hiddenMap.items.some(
      (point) => point.id === listingId || point.id === businessId
    )
  ).toBe(false)
  expect(
    (await call(viewer, `/favorites/${listingId}`, { method: "DELETE" })).status
  ).toBe(200)
})

test("preview views and clicks never create statistics", async () => {
  const { listingId } = await seedPreviewFixture()
  for (const type of ["view", "phone_click", "whatsapp_click", "share"])
    expect(
      (
        await req("/events", {
          method: "POST",
          headers: {
            origin: "http://localhost:3000",
            "content-type": "application/json",
          },
          body: JSON.stringify({ targetId: listingId, type }),
        })
      ).status
    ).toBe(200)
  const [stats] = await db
    .select()
    .from(listingStats)
    .where(eq(listingStats.listingId, listingId))
  expect(stats).toMatchObject({ views: 0, phoneClicks: 0, whatsappClicks: 0 })
})
