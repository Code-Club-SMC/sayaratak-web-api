import { beforeAll, describe, expect, test } from "bun:test"
import {
  pricePositionSchema,
  priceReportSchema,
} from "@sayaratak/shared/schemas/reports-price"

import {
  expectSchema,
  req,
  resetDb,
  type SignedIn,
  signIn,
} from "../../../tests/helpers"

let dealer: SignedIn
let seller: SignedIn

beforeAll(async () => {
  await resetDb()
  dealer = await signIn("dealership")
  seller = await signIn("user")
})

const get = (path: string, who?: SignedIn) =>
  req(path, who ? { headers: { cookie: who.cookie } } : {})

describe("step 11.7-r7 price position", () => {
  test("the Price report: summary adds up, bands follow the gap, filter and page", async () => {
    const body = await expectSchema(
      await get("/me/reports/price", dealer),
      priceReportSchema
    )
    const { live, below, around, above, unknown } = body.summary
    expect(below + around + above + unknown).toBe(live)
    // The seed price cluster gives the demo dealer one listing in each band.
    for (const n of [below, around, above]) expect(n).toBeGreaterThan(0)
    expect(body.rows.total).toBe(live)
    for (const { position: p } of body.rows.items) {
      if (p.state !== "ok") {
        expect(p.band).toBeNull()
        if (p.state === "few") expect(p.comparables).toBeLessThan(5)
        continue
      }
      expect(p.comparables).toBeGreaterThanOrEqual(5)
      expect(p.low ?? 0).toBeLessThanOrEqual(p.median ?? 0)
      expect(p.median ?? 0).toBeLessThanOrEqual(p.high ?? 0)
      const gap = p.gapPct ?? 0
      expect(p.band).toBe(gap < -10 ? "below" : gap > 10 ? "above" : "around")
    }
    const unknownOnly = await expectSchema(
      await get("/me/reports/price?band=unknown", dealer),
      priceReportSchema
    )
    expect(unknownOnly.rows.total).toBe(unknown)
    for (const r of unknownOnly.rows.items) expect(r.position.band).toBeNull()
  })

  test("one listing: the owner reads it, a stranger cannot, signed out is 401", async () => {
    const mine = await expectSchema(
      await get("/me/reports/price", dealer),
      priceReportSchema
    )
    const id = mine.rows.items[0]?.id ?? ""
    const own = await expectSchema(
      await get(`/listings/${id}/price`, dealer),
      pricePositionSchema
    )
    expect(own).toEqual(mine.rows.items[0]?.position ?? own)
    expect((await get(`/listings/${id}/price`, seller)).status).toBe(403)
    expect((await get("/listings/zzzzz/price", seller)).status).toBe(404)
    expect((await get(`/listings/${id}/price`)).status).toBe(401)
  })
})
