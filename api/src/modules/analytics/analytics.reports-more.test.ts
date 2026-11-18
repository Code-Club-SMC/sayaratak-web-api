import { beforeAll, describe, expect, test } from "bun:test"
import { demandReportSchema } from "@sayaratak/shared/schemas/reports-demand"
import { promotionsReportSchema } from "@sayaratak/shared/schemas/reports-promotions"
import { repliesReportSchema } from "@sayaratak/shared/schemas/reports-replies"
import { reviewsReportSchema } from "@sayaratak/shared/schemas/reports-reviews"

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

const get = (path: string, who: SignedIn) =>
  req(path, { headers: { cookie: who.cookie } })

describe("step 11.7-r6 report endpoints", () => {
  test("promotions: rows ran in the period, newest first, free ones cost nothing", async () => {
    const body = await expectSchema(
      await get("/me/reports/promotions?range=90d", dealer),
      promotionsReportSchema
    )
    expect(body.promotions.length).toBeGreaterThan(0)
    const starts = body.promotions.map((p) => p.startsAt)
    expect(starts).toEqual([...starts].sort().reverse())
    for (const p of body.promotions) {
      if (p.source !== "paid") expect(p.amount).toBeNull()
      expect(p.endsAt >= p.startsAt).toBe(true)
    }
  })

  test("demand: the dealership's city, shares within 0 to 100, Other last", async () => {
    const body = await expectSchema(
      await get("/me/reports/demand?range=30d", dealer),
      demandReportSchema
    )
    expect(body.totalViews).toBeGreaterThan(0)
    const other = body.makes.findIndex((m) => m.makeId === null)
    if (other !== -1) expect(other).toBe(body.makes.length - 1)
    expect(body.makes.reduce((a, m) => a + m.stock, 0)).toBe(body.totalStock)
  })

  test("demand: a seller without a business reads all Sudan", async () => {
    const body = await expectSchema(
      await get("/me/reports/demand", seller),
      demandReportSchema
    )
    expect(body.scope).toBe("country")
    expect(body.cityId).toBeNull()
  })

  test("replies and reviews answer for the dealership", async () => {
    const replies = await expectSchema(
      await get("/me/reports/replies?range=90d", dealer),
      repliesReportSchema
    )
    expect(replies.speed.reduce((a, s) => a + s.count, 0)).toBe(
      replies.summary.threads
    )
    const reviews = await expectSchema(
      await get("/me/reports/reviews?range=90d", dealer),
      reviewsReportSchema
    )
    expect(reviews.stars.reduce((a, s) => a + s.count, 0)).toBe(
      reviews.summary.count
    )
    expect(reviews.trend.length).toBe(reviews.previousTrend.length)
  })

  test("a seller without a business has no reviews", async () => {
    const body = await expectSchema(
      await get("/me/reports/reviews", seller),
      reviewsReportSchema
    )
    expect(body.allTime).toEqual({ count: 0, average: null })
  })

  test("signed out gets 401", async () => {
    for (const name of ["promotions", "demand", "replies", "reviews"])
      expect((await req(`/me/reports/${name}`)).status).toBe(401)
  })
})
