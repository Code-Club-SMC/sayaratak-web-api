import { beforeAll, describe, expect, test } from "bun:test"
import { listingsReportSchema } from "@sayaratak/shared/schemas/reports"

import {
  expectSchema,
  req,
  resetDb,
  type SignedIn,
  signIn,
} from "../../../tests/helpers"

let dealer: SignedIn

beforeAll(async () => {
  await resetDb()
  dealer = await signIn("dealership")
})

describe("GET /me/reports/listings", () => {
  test("a dealership reads its approved listings with summary and one page", async () => {
    const body = await expectSchema(
      await req("/me/reports/listings?range=90d", {
        headers: { cookie: dealer.cookie },
      }),
      listingsReportSchema
    )
    expect(body.rows.total).toBeGreaterThan(0)
    expect(body.rows.items.length).toBeLessThanOrEqual(20)
    expect(body.summary.stockAge.reduce((a, b) => a + b.count, 0)).toBe(
      body.summary.live
    )
    const views = body.rows.items.map((row) => row.views)
    expect(views).toEqual([...views].sort((a, b) => b - a))
  })

  test("signed out gets 401", async () => {
    expect((await req("/me/reports/listings")).status).toBe(401)
  })
})
