import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
import { eq } from "drizzle-orm"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import { listings } from "~/modules/listings/listings.tables"
import { reports } from "~/modules/reports/reports.tables"
import { makes } from "~/modules/taxonomy/taxonomy.tables"
import { verificationRequests } from "~/modules/verification/verification.tables"

import { adminCaller } from "../../../tests/admin"
import { req, resetDb } from "../../../tests/helpers"
import { pruneOldSearches } from "./analytics.search.service"
import { searchesDaily } from "./analytics.tables"

// Step 11.7-r4: soldAt, decided-at stamps and the aggregated search log.
const NOW = new Date("2026-11-01T12:00:00Z")

let call = adminCaller()
beforeEach(async () => {
  await resetDb()
  await db.delete(searchesDaily)
  call = adminCaller()
})
afterEach(() => spyOn(clock, "now").mockRestore())

const listingOf = (id: string) =>
  db.query.listings.findFirst({ where: eq(listings.id, id) })
const searchRows = () => db.select().from(searchesDaily)

describe("soldAt", () => {
  test("stamped on sold, kept on rented, cleared on available", async () => {
    spyOn(clock, "now").mockReturnValue(NOW)
    const status = (s: string) =>
      call("POST", "/listings/l00001/status", { status: s })
    expect((await status("sold")).status).toBe(200)
    expect((await listingOf("l00001"))?.soldAt).toEqual(NOW)
    spyOn(clock, "now").mockReturnValue(new Date("2026-11-02T00:00:00Z"))
    await status("rented")
    expect((await listingOf("l00001"))?.soldAt).toEqual(NOW)
    await status("available")
    expect((await listingOf("l00001"))?.soldAt).toBeNull()
  })

  test("the admin sheet's status change stamps it too", async () => {
    spyOn(clock, "now").mockReturnValue(NOW)
    await call("PATCH", "/admin/listings/l00001", { status: "sold" })
    expect((await listingOf("l00001"))?.soldAt).toEqual(NOW)
  })
})

describe("decidedAt", () => {
  test("listing removal, report dismissal and verification approval stamp it", async () => {
    spyOn(clock, "now").mockReturnValue(NOW)
    expect((await call("POST", "/admin/listings/l00002/remove")).status).toBe(
      200
    )
    expect((await listingOf("l00002"))?.decidedAt).toEqual(NOW)
    await call("POST", "/admin/reports/rp-1/dismiss", { note: "ok" })
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, "rp-1"))
    expect(report?.decidedAt).toEqual(NOW)
    await call("POST", "/admin/verifications/vr-1/approve")
    const [request] = await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.id, "vr-1"))
    expect(request?.decidedAt).toEqual(NOW)
  })
})

describe("search log", () => {
  test("counts page-1 searches per filter set, never the typed text", async () => {
    const [make] = await db.select({ id: makes.id }).from(makes).limit(1)
    await req(`/listings?make=${make?.id}&q=0912345678`)
    await req(`/listings?make=${make?.id}&q=other`)
    await req(`/listings?make=${make?.id}&page=2`)
    await req("/listings?limit=4")
    await req("/listings?seller=u-dealer")
    await req("/listings?featured=true")
    await req("/listings?make=no-such-make")
    const rows = await searchRows()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      kind: "vehicle",
      make: make?.id,
      city: "",
      hasText: true,
      searches: 2,
      zeroResults: 2,
    })
    expect(JSON.stringify(rows)).not.toContain("0912345678")
  })

  test("prune deletes rows older than 13 months", async () => {
    const row = {
      kind: "vehicle",
      intent: "",
      type: "",
      make: "",
      model: "",
      city: "",
      partCategory: "",
      hasText: false,
      searches: 1,
      zeroResults: 0,
      results: 5,
    }
    await db.insert(searchesDaily).values([
      { ...row, day: "2025-01-01" },
      { ...row, day: "2026-10-01" },
    ])
    spyOn(clock, "now").mockReturnValue(NOW)
    expect(await pruneOldSearches()).toBe(1)
    expect((await searchRows()).map((r) => r.day)).toEqual(["2026-10-01"])
  })
})
