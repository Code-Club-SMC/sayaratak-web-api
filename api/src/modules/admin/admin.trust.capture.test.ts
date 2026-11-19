import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { eq } from "drizzle-orm"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import { listings } from "~/modules/listings/listings.tables"
import { flagShown } from "~/modules/reviews/reviews.queries"
import { reviews } from "~/modules/reviews/reviews.tables"

import { adminCaller } from "../../../tests/admin"
import { resetDb } from "../../../tests/helpers"

// Step 11.7-r12a: the rejection code and the review flag times.
const NOW = new Date("2026-11-01T12:00:00Z")

let call = adminCaller()
beforeEach(async () => {
  await resetDb()
  call = adminCaller()
})
afterEach(() => spyOn(clock, "now").mockRestore())

const pendingIds = async () =>
  (
    await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.moderation, "pending"))
      .orderBy(listings.id)
  ).map((r) => r.id)
const listingOf = (id: string) =>
  db.query.listings.findFirst({ where: eq(listings.id, id) })
const reviewOf = (id: string) =>
  db.query.reviews.findFirst({ where: eq(reviews.id, id) })

describe("rejection code", () => {
  test("saved from the picked chip, `other` when typed, cleared on approve", async () => {
    const [a, b] = await pendingIds()
    if (!a || !b) throw new Error("the seed has fewer than 2 pending listings")
    await call("POST", `/admin/listings/${a}/reject`, {
      reason: "Unclear photos",
      code: "photos",
    })
    expect((await listingOf(a))?.rejectionCode).toBe("photos")
    await call("POST", `/admin/listings/${b}/reject`, { reason: "typed" })
    expect((await listingOf(b))?.rejectionCode).toBe("other")
    await call("POST", `/admin/listings/${a}/approve`)
    expect((await listingOf(a))?.rejectionCode).toBeNull()
  })

  test("a bad code is refused", async () => {
    const [a] = await pendingIds()
    const res = await call("POST", `/admin/listings/${a}/reject`, {
      reason: "x",
      code: "nope",
    })
    expect(res.status).toBe(422)
  })
})

describe("review flags", () => {
  test("a flag stamps flaggedAt; hiding a flagged review stamps decidedAt", async () => {
    spyOn(clock, "now").mockReturnValue(NOW)
    await flagShown(db, "r-1")
    const flagged = await reviewOf("r-1")
    expect(flagged?.status).toBe("flagged")
    expect(flagged?.flaggedAt).toEqual(NOW)
    await call("POST", "/admin/reviews/r-1/hide")
    expect((await reviewOf("r-1"))?.decidedAt).toEqual(NOW)
  })

  test("hiding a review nobody flagged is not a flag decision", async () => {
    spyOn(clock, "now").mockReturnValue(NOW)
    expect((await reviewOf("r-2"))?.status).toBe("visible")
    await call("POST", "/admin/reviews/r-2/hide")
    expect((await reviewOf("r-2"))?.decidedAt).toBeNull()
  })
})
