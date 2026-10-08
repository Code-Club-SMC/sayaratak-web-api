// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { toListingInput } from "@/features/listings/wizard/to-listing-input"
import { wizardDefaults } from "@/features/listings/wizard/wizard-defaults"
import type { Review } from "@/schemas/review"
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
const photo = (id: string) => ({
  id,
  type: "image",
  url: `/mock/${id}-{w}.webp`,
  width: 1280,
  height: 853,
  placeholderColor: "#b8c4c0",
  posterUrl: null,
})
// What the post wizard sends for a car: every field, built by the client's own mapper.
const carValues = {
  ...wizardDefaults,
  kind: "vehicle",
  vehicleType: "car",
  intent: "sale",
  title: "Toyota Corolla 2018",
  description: "Clean car, one owner, full service history.",
  price: 12_000_000,
  makeId: "toyota",
  modelId: "toyota-corolla",
  year: 2018,
  fuel: "petrol",
  transmission: "automatic",
  mileageKm: 90_000,
  media: [..."abc"].map(photo),
  cityId: "khartoum",
  districtId: "khartoum-riyadh",
  phone: "+249912345678",
  methods: ["call", "chat"],
}
const car = toListingInput(carValues)
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
    await call("POST", "/auth/forgot", {
      body: { identifier: "admin@demo.sy" },
    })
    await call("POST", "/auth/reset", {
      body: {
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
    expect(db.workshops.some((w) => w.name.en === "Test Garage")).toBe(true)
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
  it("narrows by the step 7.9 filters: repeated keys are lists, flags are yes-only, features need all", async () => {
    const total = (q: string) =>
      call("GET", `/listings?pageSize=100&${q}`).then((r) => r.body)
    const one = await total("body=sedan")
    const two = await total("body=sedan&body=suv")
    expect(one.items.length).toBeGreaterThan(0)
    expect(two.total).toBeGreaterThan(one.total)
    for (const l of two.items) expect(["sedan", "suv"]).toContain(l.bodyType)
    const owners = await total("firstOwner=true")
    for (const l of owners.items) expect(l.previousOwners).toBe(0)
    const abs = (await total("features=abs")).total
    const absSun = await total("features=abs&features=sunroof")
    expect(absSun.total).toBeLessThanOrEqual(abs)
    for (const l of absSun.items)
      expect(l.features).toEqual(expect.arrayContaining(["abs", "sunroof"]))
    expect(
      (await total("seatsMin=7")).items.every(
        (l: { seats: number }) => l.seats >= 7
      )
    ).toBe(true)
    // the map pins use the same filters
    const pins = await call("GET", "/map?body=sedan&body=suv")
    expect(pins.status).toBe(200)
  })
  it("saves and returns every step 7.9 field, empty ones as null or []", async () => {
    const created = await call("POST", "/listings", {
      as: "u-1",
      body: {
        ...car,
        bodyType: "sedan",
        doors: 4,
        accidentFree: true,
        warranty: "dealer",
        warrantyMonths: 12,
        features: ["abs", "sunroof"],
        licenseValidUntil: "2027-03-15",
      },
    })
    expect(created.status).toBe(200)
    expect(created.body).toMatchObject({
      bodyType: "sedan",
      doors: 4,
      accidentFree: true,
      warranty: "dealer",
      warrantyMonths: 12,
      features: ["abs", "sunroof"],
      licenseValidUntil: "2027-03-15",
      seats: null,
      deposit: null,
      compatibleMakeIds: [],
      partNumber: null,
    })
    const patched = await call("PATCH", `/listings/${created.body.id}`, {
      as: "u-1",
      body: { seats: 5, features: ["abs"] },
    })
    expect(patched.body).toMatchObject({
      seats: 5,
      features: ["abs"],
      doors: 4,
    })
    const bad = await call("PATCH", `/listings/${created.body.id}`, {
      as: "u-1",
      body: { doors: 9 },
    })
    expect(bad.status).toBe(422)
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
  it("a submitted listing has to pass the wizard's rules: 422 with the field keys; a draft may be incomplete", async () => {
    const bad = await call("POST", "/listings", {
      as: "u-1",
      body: toListingInput({ ...carValues, media: [photo("a")], year: null }),
    })
    expect(bad.status).toBe(422)
    expect(bad.body.fields).toMatchObject({
      media: "validation.media_min",
      year: "validation.required",
    })
    const draft = await call("POST", "/listings", {
      as: "u-1",
      body: { title: "Half done", price: 1000, cityId: "khartoum" },
    })
    expect(draft.status).toBe(200)
    expect(draft.body.moderation).toBe("draft")
    const edited = await call("PATCH", `/listings/${draft.body.id}`, {
      as: "u-1",
      body: toListingInput({ ...carValues, year: null }),
    })
    expect(edited.status).toBe(422)
    expect(edited.body.fields.year).toBe("validation.required")
  })
  it("an edit that changes title, description, photos or type sends an approved listing back to review; price never does", async () => {
    const created = await call("POST", "/listings", { as: "u-1", body: car })
    const row = db.listings.find((l) => l.id === created.body.id)!
    const newPhoto = {
      id: "m-1",
      type: "image",
      url: "/x.webp",
      width: 4,
      height: 3,
      placeholderColor: "#ccc",
      posterUrl: null,
    }
    const edit = async (body: object) => {
      row.moderation = "approved"
      return (await call("PATCH", `/listings/${row.id}`, { as: "u-1", body }))
        .body.moderation
    }
    expect(await edit({ price: 1 })).toBe("approved")
    expect(await edit({ title: row.title })).toBe("approved")
    expect(await edit({ title: "Toyota Corolla 2019" })).toBe("pending")
    expect(await edit({ description: "New text" })).toBe("pending")
    expect(await edit({ media: [newPhoto] })).toBe("pending")
    expect(await edit({ vehicleType: "truck" })).toBe("pending")
  })
  it("an auto-approved dealer keeps an approved listing live after an edit", async () => {
    db.settings.autoApproveVerifiedDealers = true
    const row = db.listings.find(
      (l) => l.ownerUserId === "u-dealer" && l.moderation === "approved"
    )!
    const res = await call("PATCH", `/listings/${row.id}`, {
      as: "u-dealer",
      body: { title: "A new title for the listing" },
    })
    expect(res.status).toBe(200)
    expect(res.body.moderation).toBe("approved")
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

describe("reviews, owner side", () => {
  const owner = () =>
    db.users.find((u) => u.role === "dealership" && u.onboardingDone)!
  const biz = () => db.dealerships.find((d) => d.ownerId === owner().id)!
  const row = (id: string, status: Review["status"], replied = false) => ({
    id,
    targetType: "dealership" as const,
    targetId: biz().id,
    authorId: "u-omar",
    authorName: "Omar",
    rating: 4,
    body: "Good dealer, fair price",
    createdAt: new Date().toISOString(),
    status,
    reply: replied
      ? { body: "Thank you", createdAt: new Date().toISOString() }
      : undefined,
  })
  const ids = async (query: string, as?: string) =>
    (
      (
        await call(
          "GET",
          `/reviews?targetType=dealership&targetId=${biz().id}${query}`,
          { as }
        )
      ).body.items as Review[]
    )
      .map((r) => r.id)
      .filter((id) => id.startsWith("t-"))

  it("hidden and unanswered reviews are for the owner to ask for, nobody else", async () => {
    db.reviews.push(
      row("t-visible", "visible"),
      row("t-replied", "visible", true),
      row("t-hidden", "hidden")
    )
    expect((await ids("&pageSize=100")).sort()).toEqual([
      "t-replied",
      "t-visible",
    ])
    expect((await ids("&pageSize=100&includeHidden=true")).sort()).toEqual([
      "t-replied",
      "t-visible",
    ])
    expect(
      (await ids("&pageSize=100&includeHidden=true", owner().id)).sort()
    ).toEqual(["t-hidden", "t-replied", "t-visible"])
    expect(
      await ids("&pageSize=100&includeHidden=true&needsReply=true", owner().id)
    ).toEqual(["t-visible"])
  })

  it("a reply is saved and edited in place; a hidden review takes none", async () => {
    db.reviews.push(row("t-a", "visible"), row("t-h", "hidden"))
    const as = owner().id
    expect(
      (
        await call("POST", "/reviews/t-a/reply", {
          as,
          body: { body: "First" },
        })
      ).status
    ).toBe(200)
    const edited = await call("POST", "/reviews/t-a/reply", {
      as,
      body: { body: "Second" },
    })
    expect(edited.body.reply.body).toBe("Second")
    expect(
      (await call("POST", "/reviews/t-h/reply", { as, body: { body: "No" } }))
        .status
    ).toBe(409)
    expect(
      (
        await call("POST", "/reviews/t-a/reply", {
          as: "u-omar",
          body: { body: "Not mine" },
        })
      ).status
    ).toBe(403)
  })

  it("a report keeps the review public and puts it in the admin Flagged list", async () => {
    db.reviews.push(row("t-f", "visible"))
    const as = owner().id
    expect((await call("POST", "/reviews/t-f/flag", { as })).body.status).toBe(
      "flagged"
    )
    expect(await ids("&pageSize=100")).toContain("t-f")
    const admin = db.users.find((u) => u.role === "admin")!.id
    const flagged = await call(
      "GET",
      "/admin/reviews?status=flagged&pageSize=100",
      {
        as: admin,
      }
    )
    expect((flagged.body.items as Review[]).some((r) => r.id === "t-f")).toBe(
      true
    )
    expect(
      (await call("POST", "/reviews/t-f/flag", { as: "u-omar" })).status
    ).toBe(403)
  })
})

describe("saved", () => {
  it("favorites toggle and update stats; signed out is 401", async () => {
    const id = db.listings.find((l) => l.moderation === "approved")?.id ?? ""
    const before = db.listings.find((l) => l.id === id)?.stats.favorites ?? 0
    await call("POST", "/favorites", { as: "u-new", body: { listingId: id } })
    expect(
      (await call("GET", "/me/favorite-ids", { as: "u-new" })).body
    ).toEqual({ ids: [id] })
    expect(db.listings.find((l) => l.id === id)?.stats.favorites).toBe(
      before + 1
    )
    await call("DELETE", `/favorites/${id}`, { as: "u-new" })
    expect(
      (await call("GET", "/me/favorite-ids", { as: "u-new" })).body
    ).toEqual({ ids: [] })
    // The ids endpoint is public: signed out it is just empty.
    expect((await call("GET", "/me/favorite-ids")).body).toEqual({ ids: [] })
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

describe("messaging demo reply", () => {
  afterEach(() => vi.unstubAllEnvs())
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const listing = () =>
    db.listings.find(
      (l) => l.ownerUserId === "u-omar" && l.moderation === "approved"
    )
  const messagesOf = (id: string) =>
    db.messages.filter((m) => m.threadId === id)

  it("answers a new thread once, from the owner, after the delay", async () => {
    vi.stubEnv("VITE_DEMO", "true")
    vi.stubEnv("MOCK_REPLY_MS", "30")
    const thread = await call("POST", "/threads", {
      as: "u-1",
      body: { subjectType: "listing", subjectId: listing()?.id, body: "Hi" },
    })
    expect(thread.body.subjectSlug).toBe(listing()?.slug)
    expect(messagesOf(thread.body.id)).toHaveLength(1)
    await wait(120)
    const [first, reply] = messagesOf(thread.body.id)
    expect(reply?.senderId).toBe("u-omar")
    expect(first?.senderId).toBe("u-1")
    // The owner has spoken now, so nothing more is scripted.
    await call("POST", `/threads/${thread.body.id}/messages`, {
      as: "u-1",
      body: { body: "And the price?" },
    })
    await wait(120)
    expect(messagesOf(thread.body.id)).toHaveLength(3)
  })

  it("stays silent when the demo is off, and in threads the other person already wrote in", async () => {
    vi.stubEnv("VITE_DEMO", "false")
    vi.stubEnv("MOCK_REPLY_MS", "30")
    const off = await call("POST", "/threads", {
      as: "u-1",
      body: { subjectType: "listing", subjectId: listing()?.id, body: "Hi" },
    })
    await wait(120)
    expect(messagesOf(off.body.id)).toHaveLength(1)

    vi.stubEnv("VITE_DEMO", "true")
    const seeded = db.threads.find((t) => t.participantIds.includes("u-omar"))
    const before = messagesOf(seeded?.id ?? "").length
    await call("POST", `/threads/${seeded?.id}/messages`, {
      as: "u-omar",
      body: { body: "Thanks" },
    })
    await wait(120)
    expect(messagesOf(seeded?.id ?? "")).toHaveLength(before + 1)
  })
})

describe("billing, promotions and payments", () => {
  const receipt = (itemType: string, itemId: string, extra = {}) => {
    const form = new FormData()
    form.set("itemType", itemType)
    form.set("itemId", itemId)
    form.set("transactionRef", "TX123456")
    form.set("payerName", "Omar Hassan")
    form.set("receipt", file("r.png", 100))
    for (const [k, v] of Object.entries(extra)) form.set(k, String(v))
    return form
  }
  it("a receipt creates a pending payment; approval activates the plan and notifies", async () => {
    const paid = await call("POST", "/payments", {
      as: "u-1",
      form: receipt("plan", "plan-user-plus"),
    })
    expect(paid.status).toBe(200)
    expect(paid.body.status).toBe("pending_review")
    expect(paid.body.payerName).toBe("Omar Hassan")
    expect(
      (
        await call("POST", "/payments", {
          as: "u-1",
          form: receipt("plan", "plan-user-plus"),
        })
      ).body.code
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
    const mine = (await call("GET", "/me/subscription", { as: "u-1" })).body
    expect(mine.subscription.planId).toBe("plan-user-plus")
    expect(mine.subscription.price).toBe(50_000)
    expect(mine.plan.id).toBe("plan-user-plus")
    expect(
      db.notifications.some(
        (n) => n.userId === "u-1" && n.type === "payment_approved"
      )
    ).toBe(true)
  })
  it("a payment needs the payer name", async () => {
    const res = await call("POST", "/payments", {
      as: "u-1",
      form: receipt("plan", "plan-user-plus", { payerName: "" }),
    })
    expect(res.status).toBe(422)
    expect(res.body.fields.payerName).toBe("validation.name_min")
  })
  it("a promotion starts unpaid, is paid through checkout, and runs once approved", async () => {
    const listing = db.listings.find(
      (l) =>
        l.ownerUserId === "u-omar" &&
        l.moderation === "approved" &&
        l.promotions.length === 0 &&
        !db.promotions.some((p) => p.listingId === l.id)
    )
    const made = await call("POST", "/promotions", {
      as: "u-omar",
      body: { listingId: listing?.id, type: "pin" },
    })
    expect(made.body.status).toBe("pending_payment")
    expect(made.body.durationDays).toBe(7)
    // Asking again returns the same unpaid promotion.
    const again = await call("POST", "/promotions", {
      as: "u-omar",
      body: { listingId: listing?.id, type: "pin" },
    })
    expect(again.body.id).toBe(made.body.id)
    const item = `promotion:${made.body.id}`
    const checkout = await call("GET", `/checkout?item=${item}`, {
      as: "u-omar",
    })
    expect(checkout.body).toMatchObject({
      itemType: "promotion",
      amount: 50_000,
      durationDays: 7,
      pendingPaymentId: null,
      bankak: { name: "Sayaratak", number: "1234567" },
    })
    const pay = await call("POST", "/payments", {
      as: "u-omar",
      form: receipt("promotion", made.body.id),
    })
    expect(pay.body.reference).toBe(checkout.body.reference)
    expect(
      (await call("GET", `/checkout?item=${item}`, { as: "u-omar" })).body
        .pendingPaymentId
    ).toBe(pay.body.id)
    const mine = (await call("GET", "/me/promotions", { as: "u-omar" })).body
    expect(
      mine.items.find((p: { id: string }) => p.id === made.body.id)
    ).toMatchObject({
      status: "pending_payment",
      paymentStatus: "pending_review",
      price: 50_000,
    })
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
    const running = db.promotions.find((p) => p.id === made.body.id)
    expect(running?.status).toBe("active")
    expect(running?.endsAt).toBeTruthy()
    // Ending it takes it off the listing.
    await call("POST", `/admin/promotions/${made.body.id}/end`, {
      as: "u-admin",
    })
    expect(listing?.promotions.map((p) => p.type)).not.toContain("pin")
    expect(db.promotions.find((p) => p.id === made.body.id)?.status).toBe(
      "ended"
    )
  })
  it("an admin grant starts at once and is free", async () => {
    const listing = db.listings.find(
      (l) => l.moderation === "approved" && l.promotions.length === 0
    )
    const grant = await call("POST", "/admin/promotions/grant", {
      as: "u-admin",
      body: { listingId: listing?.id, type: "boost", days: 5 },
    })
    expect(grant.body).toMatchObject({
      status: "active",
      source: "admin_grant",
      durationDays: 5,
      price: 0,
      paymentStatus: "none",
    })
    expect(listing?.promotions.map((p) => p.type)).toContain("boost")
  })
  it("plans hide the individual ones when individual subscriptions are off", async () => {
    expect((await call("GET", "/plans?audience=user")).body.length).toBe(2)
    db.settings.individualSubscriptionsEnabled = false
    expect((await call("GET", "/plans?audience=user")).body).toEqual([])
    const all = (await call("GET", "/plans")).body
    expect(all.some((p: { audience: string }) => p.audience === "user")).toBe(
      false
    )
    const usage = (await call("GET", "/me/subscription", { as: "u-1" })).body
      .usage
    expect(usage.limit).toBeNull()
  })
  it("the first plan of every audience is free", () => {
    for (const audience of ["user", "dealership", "workshop", "mechanic"]) {
      const first = db.plans
        .filter((p) => p.audience === audience)
        .sort((a, b) => a.sortOrder - b.sortOrder)[0]
      expect(first?.price).toBe(0)
    }
  })
  it("the payments page carries the summary strip and the payer", async () => {
    const page = (await call("GET", "/admin/payments", { as: "u-admin" })).body
    expect(page.summary.pendingCount).toBe(
      db.payments.filter((p) => p.status === "pending_review").length
    )
    expect(page.items[0].user.name).toBeTruthy()
    expect(page.summary.approvedThisMonth).toBeGreaterThanOrEqual(0)
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
    ).toHaveLength(4)
  })
  it("contact stores the message, a bad one is a 422 with key errors", async () => {
    const body = {
      name: "Omar",
      contact: "a@b.co",
      subject: "business",
      message: "Do you list dealerships?",
    }
    expect((await call("POST", "/contact", { body })).status).toBe(200)
    expect(db.contacts[0]).toMatchObject(body)
    const bad = await call("POST", "/contact", {
      body: { ...body, contact: "nope", message: "short" },
    })
    expect(bad.status).toBe(422)
    expect(bad.body.fields).toMatchObject({
      contact: "validation.identifier",
      message: "validation.message_min",
    })
    expect(db.contacts).toHaveLength(1)
  })
  it("map is capped at 300 points and respects the bbox", async () => {
    // `layers` repeats like every array param.
    const all = await call(
      "GET",
      "/map?layers=vehicles&layers=dealerships&layers=workshops&layers=mechanics"
    )
    expect(all.body.items.length).toBeLessThanOrEqual(300)
    expect(all.body.total).toBeGreaterThanOrEqual(all.body.items.length)
    const none = await call("GET", "/map?layers=vehicles&bbox=0,0,1,1")
    expect(none.body).toEqual({ items: [], total: 0 })
    const dealers = await call("GET", "/map?layers=dealerships")
    expect(
      dealers.body.items.every((p: { kind: string }) => p.kind === "dealership")
    ).toBe(true)
  })
  it("the vehicle layer rounds positions for everyone but the owner", async () => {
    const mine = db.listings.find(
      (l) =>
        l.ownerUserId === "u-omar" && l.moderation === "approved" && l.location
    )
    const point = (await call("GET", "/map?layers=vehicles")).body.items.find(
      (p: { id: string }) => p.id === mine?.id
    )
    const round = (n: number) => Math.round(n * 100) / 100
    expect(point.location).toEqual({
      lat: round(mine?.location?.lat ?? 0),
      lng: round(mine?.location?.lng ?? 0),
    })
  })
  it("uploads return a Media, serve the file and refuse files over the limits", async () => {
    const form = new FormData()
    form.set("file", file("a.png", 20))
    form.set("width", "100")
    form.set("height", "80")
    form.set("placeholderColor", "#112233")
    const up = await call("POST", "/uploads", { form })
    expect(up.status).toBe(201)
    expect(up.body).toMatchObject({
      type: "image",
      width: 100,
      height: 80,
      placeholderColor: "#112233",
      posterUrl: null,
    })
    expect(up.body.url).toContain("{w}")
    const got = await call(
      "GET",
      up.body.url.replace("/api", "").replace("{w}", "640")
    )
    expect(got.raw.byteLength).toBe(20)
    const big = new FormData()
    big.set("file", file("b.png", 5 * 1024 * 1024 + 1))
    expect(
      (await call("POST", "/uploads", { form: big })).body.fields.file
    ).toBe("validation.file_size_5mb")
    const pdf = new FormData()
    pdf.set("file", file("c.pdf", 10, "application/pdf"))
    expect(
      (await call("POST", "/uploads", { form: pdf })).body.fields.file
    ).toBe("validation.image_type")
  })
  it("a video upload stores its poster and allows 30 MB", async () => {
    const form = new FormData()
    form.set("file", file("v.mp4", 6 * 1024 * 1024, "video/mp4"))
    form.set("poster", file("p.webp", 10, "image/webp"))
    const up = await call("POST", "/uploads", { form })
    expect(up.body.type).toBe("video")
    expect(up.body.posterUrl).toContain("{w}")
    const poster = await call(
      "GET",
      up.body.posterUrl.replace("/api", "").replace("{w}", "640")
    )
    expect(poster.raw.byteLength).toBe(10)
    const big = new FormData()
    big.set("file", file("w.mp4", 30 * 1024 * 1024 + 1, "video/mp4"))
    expect(
      (await call("POST", "/uploads", { form: big })).body.fields.file
    ).toBe("validation.video_size")
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
    expect(a.body.daily).toHaveLength(7)
    expect(a.body.totals.views).toBeGreaterThan(0)
    expect(a.body.previous.views).toBeGreaterThanOrEqual(0)
    // Only dealerships get a top-listings table.
    expect(a.body.topListings).toEqual([])
    const dealer = await call("GET", "/me/analytics?range=30d", {
      as: "u-dealer",
    })
    expect(dealer.body.topListings.length).toBeGreaterThan(0)
    expect(dealer.body.topListings.length).toBeLessThanOrEqual(10)
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
  it("a notification is skipped when its switch is off, and links to the recipient's own page", async () => {
    const created = await call("POST", "/listings", { as: "u-1", body: car })
    const id = created.body.id
    const mine = (userId: string, type: string) =>
      db.notifications.filter((n) => n.userId === userId && n.type === type)
    const patched = await call("PATCH", "/me/notification-prefs", {
      as: "u-1",
      body: { updates: false },
    })
    expect(patched.body).toMatchObject({ updates: false, messages: true })
    await call("POST", `/admin/listings/${id}/approve`, { as: "u-admin" })
    expect(mine("u-1", "listing_approved")).toHaveLength(0)
    await call("PATCH", "/me/notification-prefs", {
      as: "u-1",
      body: { updates: true },
    })
    await call("POST", `/admin/listings/${id}/reject`, {
      as: "u-admin",
      body: { reason: "Blurry photos" },
    })
    // The buyer's page is "listings"; the dealer's is "inventory".
    expect(mine("u-1", "listing_rejected")[0]?.href).toBe("/account/listings")
    const dealerListing = db.listings.find(
      (l) => l.ownerUserId === "u-dealer" && l.moderation === "approved"
    )!
    await call("POST", `/admin/listings/${dealerListing.id}/reject`, {
      as: "u-admin",
      body: { reason: "Blurry photos" },
    })
    expect(mine("u-dealer", "listing_rejected")[0]?.href).toBe(
      "/dealer/inventory"
    )
  })
  it("a broadcast respects announcements; new messages link to the thread in the role's inbox", async () => {
    const owner = db.users.find(
      (u) =>
        (u.role === "workshop" || u.role === "mechanic") &&
        db.threads.some((t) => t.participantIds.includes(u.id))
    )!
    const thread = db.threads.find((t) => t.participantIds.includes(owner.id))!
    await call("PATCH", "/me/notification-prefs", {
      as: owner.id,
      body: { announcements: false },
    })
    await call("POST", "/admin/broadcasts", {
      as: "u-admin",
      body: { audience: owner.role, title: "Hi all", body: "Welcome" },
    })
    expect(
      db.notifications.filter(
        (n) => n.userId === owner.id && n.title.en === "Hi all"
      )
    ).toHaveLength(0)
    const other = thread.participantIds.find((p) => p !== owner.id)!
    await call("POST", `/threads/${thread.id}/messages`, {
      as: other,
      body: { body: "Hello" },
    })
    const inbox = owner.role === "workshop" ? "workshop" : "mechanic"
    expect(
      db.notifications.find(
        (n) => n.userId === owner.id && n.type === "message"
      )?.href
    ).toBe(`/${inbox}/inquiries?thread=${thread.id}`)
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
    const stats = (
      await call("GET", "/admin/stats?range=7d", { as: "u-admin" })
    ).body
    expect(stats.totals.users).toBe(db.users.length)
    expect(stats.series.newListings).toHaveLength(7)
    expect(stats.series.revenue).toHaveLength(7)
    // The feed is newest first, at most ten, and each row links to its screen with the item selected.
    const feed = (await call("GET", "/admin/activity", { as: "u-admin" })).body
      .items
    expect(feed.length).toBeLessThanOrEqual(10)
    expect(feed.every((i: { href: string }) => i.href.includes("?id="))).toBe(
      true
    )
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
    expect(sent.body.recipients).toBe(est.body.count)
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
