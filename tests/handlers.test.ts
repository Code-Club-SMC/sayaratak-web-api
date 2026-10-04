// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest"
import { z } from "zod"

import { db, resetDb } from "@/mocks/db"
import { handleMock } from "@/mocks/router"

type Opts = { as?: string; body?: unknown; form?: FormData }
async function call(method: string, path: string, o: Opts = {}) {
  const headers: Record<string, string> = {}
  if (o.as) headers.cookie = `sy_session=${o.as}`
  if (o.body !== undefined) headers["content-type"] = "application/json"
  const res = await handleMock(
    new Request(`http://localhost/api${path}`, {
      method,
      headers,
      body:
        o.form ?? (o.body !== undefined ? JSON.stringify(o.body) : undefined),
    })
  )
  const raw = await res.clone().arrayBuffer()
  const body = res.headers.get("content-type")?.includes("json")
    ? await res.json()
    : null
  return { status: res.status, body, res, raw }
}
const car = {
  title: "Toyota Corolla 2018",
  price: 12_000_000,
  cityId: "khartoum",
  kind: "vehicle",
  intent: "sale",
  vehicleType: "car",
  makeId: "toyota",
  modelId: "toyota-corolla",
  submit: true,
}
const file = (name: string, size: number, type = "image/png") =>
  new File([new Uint8Array(size)], name, { type })

beforeEach(() => {
  resetDb()
})

describe("auth", () => {
  it("login sets the session cookie, bad password is 401, five misses throttle, reset clears", async () => {
    const ok = await call("POST", "/auth/login", {
      body: { identifier: "dealer@demo.sy", password: "Demo1234" },
    })
    expect(ok.status).toBe(200)
    expect(ok.res.headers.get("set-cookie")).toContain("sy_session=u-dealer")
    for (let i = 0; i < 5; i++) {
      expect(
        (
          await call("POST", "/auth/login", {
            body: { identifier: "admin@demo.sy", password: "wrong1234" },
          })
        ).body.code
      ).toBe("invalid_credentials")
    }
    const locked = await call("POST", "/auth/login", {
      body: { identifier: "admin@demo.sy", password: "Demo1234" },
    })
    expect(locked.status).toBe(429)
    expect(locked.body.retryAfter).toBeGreaterThan(0)
    await call("POST", "/auth/reset", {
      body: {
        identifier: "admin@demo.sy",
        token: "demo-reset",
        password: "Demo1234",
      },
    })
    expect(
      (
        await call("POST", "/auth/login", {
          body: { identifier: "admin@demo.sy", password: "Demo1234" },
        })
      ).status
    ).toBe(200)
  })
  it("register creates a role-less-until-onboarding user and refuses a taken identifier", async () => {
    const res = await call("POST", "/auth/register", {
      body: {
        identifier: "+249911111111",
        fullName: "Sara Ali",
        password: "Passw0rd1",
      },
    })
    expect(res.status).toBe(201)
    expect(res.body.onboardingDone).toBe(false)
    expect(
      (
        await call("POST", "/auth/register", {
          body: {
            identifier: "+249911111111",
            fullName: "Sara Ali",
            password: "Passw0rd1",
          },
        })
      ).body.code
    ).toBe("exists")
  })
  it("onboarding creates the business record", async () => {
    const done = await call("POST", "/onboarding/complete", {
      as: "u-new",
      body: {
        role: "workshop",
        payload: {
          name: "Test Garage",
          cityId: "kassala",
          phone: "+249912000111",
        },
      },
    })
    expect(done.body).toMatchObject({ role: "workshop", onboardingDone: true })
    expect(db.workshops.some((w) => w.name === "Test Garage")).toBe(true)
  })
})

describe("listings", () => {
  it("search filters, ranks paid tiers first, paginates by 24 and returns facets", async () => {
    const res = await call(
      "GET",
      "/listings?intent=sale&type=car&fuel=petrol&sort=relevance"
    )
    expect(res.status).toBe(200)
    expect(res.body.items.length).toBeLessThanOrEqual(24)
    expect(
      res.body.items.every(
        (l: { fuelType?: string; fuel: string; vehicleType: string }) =>
          l.fuel === "petrol" && l.vehicleType === "car"
      )
    ).toBe(true)
    expect(res.body.facets.fuel.length).toBeGreaterThan(1) // fuel facet ignores the fuel filter itself
    expect(res.body.pageSize).toBe(24)
    const promoted = res.body.items.findIndex(
      (l: { promotions: unknown[] }) => l.promotions.length > 0
    )
    const plain = res.body.items.findIndex(
      (l: { promotions: unknown[] }) => l.promotions.length === 0
    )
    if (promoted >= 0 && plain >= 0) expect(promoted).toBeLessThan(plain)
    const cheap = await call(
      "GET",
      "/listings?intent=sale&type=car&sort=price_asc&page=1"
    )
    const prices = cheap.body.items.map((l: { price: number }) => l.price)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
    const near = await call("GET", "/listings?lat=15.5&lng=32.56&radius=5")
    expect(
      near.body.items.every((l: { cityId: string }) =>
        ["khartoum", "bahri", "omdurman"].includes(l.cityId)
      )
    ).toBe(true)
  })
  it("creates a pending listing, enforces the free limit, hides it until approved", async () => {
    const created = await call("POST", "/listings", { as: "u-1", body: car })
    expect(created.status).toBe(200)
    expect(created.body.moderation).toBe("pending")
    expect((await call("GET", `/listings/${created.body.slug}`)).status).toBe(
      404
    )
    expect(
      (await call("GET", `/listings/${created.body.slug}`, { as: "u-1" }))
        .status
    ).toBe(200)
    await call("POST", "/listings", { as: "u-1", body: car })
    await call("POST", "/listings", { as: "u-1", body: car })
    const over = await call("POST", "/listings", { as: "u-1", body: car })
    expect(over.status).toBe(403)
    expect(over.body.code).toBe("limit_reached")
    expect(
      (await call("POST", "/listings", { as: "u-workshop", body: car })).status
    ).toBe(403)
  })
})

describe("directory", () => {
  it("filters dealerships and 404s an unknown slug", async () => {
    const res = await call("GET", "/dealerships?verified=true")
    expect(res.body.items.length).toBeGreaterThan(0)
    expect(res.body.items.every((d: { verified: boolean }) => d.verified)).toBe(
      true
    )
    expect((await call("GET", "/workshops/nope")).body.code).toBe("not_found")
    expect(
      (await call("GET", "/mechanics?available=true&minYears=5")).status
    ).toBe(200)
  })
  it("a workshop owner edits own services", async () => {
    const added = await call("POST", "/me/services", {
      as: "u-workshop",
      body: { name: "Wheel alignment", priceFrom: 40000 },
    })
    expect(added.status).toBe(200)
    expect(
      (await call("GET", "/me/services", { as: "u-workshop" })).body.some(
        (s: { id: string }) => s.id === added.body.id
      )
    ).toBe(true)
    expect((await call("GET", "/me/services", { as: "u-omar" })).status).toBe(
      403
    )
  })
})

describe("reviews", () => {
  it("adds a review, recomputes the rating, refuses a second one", async () => {
    const before = db.dealerships[1]?.rating.count ?? 0
    const target = db.dealerships[1]
    const body = {
      targetType: "dealership",
      targetId: target?.id,
      rating: 5,
      body: "Very good dealer and fair price",
    }
    expect(
      (await call("POST", "/reviews", { as: "u-omar", body })).status
    ).toBe(200)
    expect(target?.rating.count).toBe(before + 1)
    expect(
      (await call("POST", "/reviews", { as: "u-omar", body })).body.code
    ).toBe("already_reviewed")
    expect((await call("POST", "/reviews", { body })).status).toBe(401)
  })
})

describe("saved", () => {
  it("favorites toggle and update stats; signed out is 401", async () => {
    const id = db.listings.find((l) => l.moderation === "approved")?.id ?? ""
    const before = db.listings.find((l) => l.id === id)?.stats.favorites ?? 0
    await call("POST", "/favorites", { as: "u-new", body: { listingId: id } })
    expect((await call("GET", "/favorites/ids", { as: "u-new" })).body).toEqual(
      [id]
    )
    expect(db.listings.find((l) => l.id === id)?.stats.favorites).toBe(
      before + 1
    )
    await call("DELETE", `/favorites/${id}`, { as: "u-new" })
    expect((await call("GET", "/favorites/ids", { as: "u-new" })).body).toEqual(
      []
    )
    expect((await call("GET", "/favorites")).status).toBe(401)
  })
  it("saved searches: create, mark seen", async () => {
    const created = await call("POST", "/saved-searches", {
      as: "u-new",
      body: { name: "Cars", params: { kind: "vehicle", type: "car" } },
    })
    expect(created.status).toBe(200)
    const seen = await call("PATCH", `/saved-searches/${created.body.id}`, {
      as: "u-new",
      body: { markSeen: true, alerts: false },
    })
    expect(seen.body).toMatchObject({ newCount: 0, alerts: false })
    expect(
      (
        await call("PATCH", `/saved-searches/${created.body.id}`, {
          as: "u-omar",
          body: {},
        })
      ).status
    ).toBe(404)
  })
})

describe("messaging and notifications", () => {
  it("starts a thread, notifies the seller, counts unread, marks read", async () => {
    const listing = db.listings.find(
      (l) => l.ownerUserId === "u-omar" && l.moderation === "approved"
    )
    const thread = await call("POST", "/threads", {
      as: "u-1",
      body: {
        subjectType: "listing",
        subjectId: listing?.id,
        body: "Is it still available?",
      },
    })
    expect(thread.status).toBe(200)
    const unreadBefore = (await call("GET", "/me/counts", { as: "u-omar" }))
      .body
    expect(unreadBefore.unreadMessages).toBeGreaterThan(0)
    expect(
      db.notifications.some(
        (n) => n.userId === "u-omar" && n.type === "message"
      )
    ).toBe(true)
    await call("POST", `/threads/${thread.body.id}/read`, { as: "u-omar" })
    expect(
      (await call("GET", "/threads", { as: "u-omar" })).body.find(
        (t: { id: string }) => t.id === thread.body.id
      ).unreadCount
    ).toBe(0)
    expect(
      (
        await call("GET", `/threads/${thread.body.id}/messages`, {
          as: "u-dealer",
        })
      ).status
    ).toBe(403)
    await call("POST", "/notifications/read", { as: "u-omar", body: {} })
    expect(
      (await call("GET", "/me/counts", { as: "u-omar" })).body
        .unreadNotifications
    ).toBe(0)
  })
})

describe("billing, promotions and payments", () => {
  it("a receipt creates a pending payment; approval activates the plan and notifies", async () => {
    const form = new FormData()
    form.set("itemType", "plan")
    form.set("itemId", "plan-user-plus")
    form.set("transactionRef", "TX123456")
    form.set("receipt", file("r.png", 100))
    const paid = await call("POST", "/payments", { as: "u-1", form })
    expect(paid.status).toBe(200)
    expect(paid.body.status).toBe("pending_review")
    const dup = new FormData()
    dup.set("itemType", "plan")
    dup.set("itemId", "plan-user-plus")
    dup.set("transactionRef", "TX123456")
    dup.set("receipt", file("r.png", 100))
    expect(
      (await call("POST", "/payments", { as: "u-1", form: dup })).body.code
    ).toBe("payment_pending")
    expect(
      (
        await call("POST", `/admin/payments/${paid.body.id}/approve`, {
          as: "u-omar",
        })
      ).status
    ).toBe(403)
    await call("POST", `/admin/payments/${paid.body.id}/approve`, {
      as: "u-admin",
    })
    expect(
      (await call("GET", "/me/subscription", { as: "u-1" })).body.planId
    ).toBe("plan-user-plus")
    expect(
      db.notifications.some(
        (n) => n.userId === "u-1" && n.type === "payment_approved"
      )
    ).toBe(true)
  })
  it("a promotion payment adds the promotion when approved; rejection needs a reason", async () => {
    const listing = db.listings.find(
      (l) =>
        l.ownerUserId === "u-omar" &&
        l.moderation === "approved" &&
        l.promotions.length === 0
    )
    const pay = await call("POST", "/promotions", {
      as: "u-omar",
      body: { listingId: listing?.id, type: "pin" },
    })
    expect(pay.body.status).toBe("pending_review")
    expect(
      (
        await call("POST", `/admin/payments/${pay.body.id}/reject`, {
          as: "u-admin",
          body: {},
        })
      ).status
    ).toBe(422)
    await call("POST", `/admin/payments/${pay.body.id}/approve`, {
      as: "u-admin",
    })
    expect(listing?.promotions.map((p) => p.type)).toContain("pin")
    expect((await call("GET", "/plans")).body.length).toBeGreaterThan(5)
  })
})

describe("trust, content, map, uploads, analytics", () => {
  it("reports need details for 'other'", async () => {
    const listingId = db.listings[0]?.id
    expect(
      (
        await call("POST", "/reports", {
          as: "u-1",
          body: { listingId, reason: "scam" },
        })
      ).status
    ).toBe(200)
    expect(
      (
        await call("POST", "/reports", {
          as: "u-1",
          body: { listingId, reason: "other" },
        })
      ).body.fields.details
    ).toBe("validation.details_required")
  })
  it("pages, banners, 404", async () => {
    expect((await call("GET", "/pages/about")).body.title.en).toBe("About us")
    expect((await call("GET", "/pages/unknown")).status).toBe(404)
    expect(
      (await call("GET", "/banners?placement=home_top")).body
    ).toHaveLength(1)
  })
  it("map is capped at 300 points and respects the bbox", async () => {
    const all = await call(
      "GET",
      "/map?layers=vehicles,dealerships,workshops,mechanics"
    )
    expect(all.body.length).toBeLessThanOrEqual(300)
    const none = await call("GET", "/map?layers=vehicles&bbox=0,0,1,1")
    expect(none.body).toEqual([])
  })
  it("uploads store and serve a file and refuse files over 5 MB", async () => {
    const form = new FormData()
    form.set("file", file("a.png", 20))
    const up = await call("POST", "/uploads", { form })
    expect(up.status).toBe(201)
    const got = await call("GET", up.body.url.replace("/api", ""))
    expect(got.raw.byteLength).toBe(20)
    const big = new FormData()
    big.set("file", file("b.png", 5 * 1024 * 1024 + 1))
    expect(
      (await call("POST", "/uploads", { form: big })).body.fields.file
    ).toBe("validation.file_size_5mb")
  })
  it("events raise listing stats and the daily series", async () => {
    const listing = db.listings.find(
      (l) => l.ownerUserId === "u-omar" && l.moderation === "approved"
    )
    const before = listing?.stats.views ?? 0
    await call("POST", "/events", {
      body: { type: "view", targetId: listing?.id },
    })
    expect(listing?.stats.views).toBe(before + 1)
    const a = await call("GET", "/me/analytics?range=7d", { as: "u-omar" })
    expect(a.body.series).toHaveLength(7)
    expect(a.body.totals.views).toBeGreaterThan(0)
  })
})

describe("admin", () => {
  it("approving a listing notifies the owner and matches saved searches; non-admins are refused", async () => {
    const created = await call("POST", "/listings", { as: "u-1", body: car })
    const alertsBefore =
      db.savedSearches.find((s) => s.id === "ss-1")?.newCount ?? 0
    expect(
      (
        await call("POST", `/admin/listings/${created.body.id}/approve`, {
          as: "u-omar",
        })
      ).status
    ).toBe(403)
    await call("POST", `/admin/listings/${created.body.id}/approve`, {
      as: "u-admin",
    })
    expect(
      db.notifications.some(
        (n) => n.userId === "u-1" && n.type === "listing_approved"
      )
    ).toBe(true)
    expect(db.savedSearches.find((s) => s.id === "ss-1")?.newCount).toBe(
      alertsBefore + 1
    )
    expect(
      db.notifications.some(
        (n) => n.userId === "u-omar" && n.type === "saved_search_match"
      )
    ).toBe(true)
    const rejected = await call(
      "POST",
      `/admin/listings/${created.body.id}/reject`,
      { as: "u-admin", body: { reason: "Blurry photos" } }
    )
    expect(rejected.body).toMatchObject({
      moderation: "rejected",
      rejectionReason: "Blurry photos",
    })
  })
  it("search returns at most five hits per group; stats and counts add the admin extras", async () => {
    const s = await call("GET", "/admin/search?q=a", { as: "u-admin" })
    for (const group of Object.values(
      z.record(z.string(), z.array(z.unknown())).parse(s.body)
    ))
      expect(group.length).toBeLessThanOrEqual(5)
    expect(
      (await call("GET", "/me/counts", { as: "u-admin" })).body.pendingListings
    ).toBeGreaterThan(0)
    expect(
      (await call("GET", "/admin/stats", { as: "u-admin" })).body.users
    ).toBe(db.users.length)
  })
  it("taxonomy rows in use cannot be deleted; broadcasts notify the audience", async () => {
    expect(
      (
        await call("DELETE", "/admin/taxonomy/cities/khartoum", {
          as: "u-admin",
        })
      ).body.code
    ).toBe("in_use")
    const created = await call("POST", "/admin/taxonomy/cities", {
      as: "u-admin",
      body: {
        slug: "dongola",
        name: { ar: "دنقلا", en: "Dongola" },
        center: { lat: 19.17, lng: 30.48 },
      },
    })
    expect(created.status).toBe(200)
    expect(
      (
        await call("DELETE", "/admin/taxonomy/cities/dongola", {
          as: "u-admin",
        })
      ).status
    ).toBe(200)
    const est = await call(
      "GET",
      "/admin/broadcasts/estimate?audience=mechanic",
      { as: "u-admin" }
    )
    const sent = await call("POST", "/admin/broadcasts", {
      as: "u-admin",
      body: { audience: "mechanic", title: "Hello", body: "Welcome" },
    })
    expect(sent.body.recipients).toBe(est.body.recipients)
    expect(
      db.notifications.some(
        (n) => n.userId === "u-mechanic" && n.type === "broadcast"
      )
    ).toBe(true)
  })
})

describe("mock", () => {
  it("reset restores the seed", async () => {
    await call("POST", "/listings", { as: "u-1", body: car })
    const count = db.listings.length
    await call("POST", "/mock/reset")
    expect(db.listings.length).toBe(count - 1)
  })
})
