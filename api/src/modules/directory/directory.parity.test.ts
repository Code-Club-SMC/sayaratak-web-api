import { afterAll, beforeAll, describe, spyOn, test } from "bun:test"
import { eq } from "drizzle-orm"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import { user } from "~/modules/auth/auth.tables"
import { dealerships, workshops } from "~/modules/businesses/businesses.tables"

import { resetDb } from "../../../tests/helpers"
import { expectParity } from "../../../tests/parity"

beforeAll(resetDb)
afterAll(async () => {
  spyOn(Date, "now").mockRestore()
  spyOn(clock, "now").mockRestore()
  // A test below bans an owner on both sides; start the next suite clean.
  await resetDb()
})

const dealers = (query = "") => expectParity(`/api/v1/dealerships${query}`)
const shops = (query = "") => expectParity(`/api/v1/workshops${query}`)
const mechanics = (query = "") => expectParity(`/api/v1/mechanics${query}`)

describe("GET /dealerships matches the mock", () => {
  test("every sort, an unknown sort and the pages", async () => {
    await dealers()
    for (const sort of ["rating", "listings", "newest", "bogus"])
      await dealers(`?sort=${sort}`)
    await dealers("?page=2&pageSize=5")
    await dealers("?limit=3&sort=newest")
    await dealers("?page=99")
    await dealers("?pageSize=1000")
  })

  test("filters", async () => {
    await dealers("?city=khartoum")
    await dealers("?city=khartoum&sort=listings")
    await dealers("?verified=true")
    await dealers("?q=motors")
    await dealers("?q=MOTORS&city=khartoum")
    await dealers("?q=معرض")
    // Empty results must agree too.
    await dealers("?q=zzzz")
    await dealers("?city=nowhere")
    await dealers("?q=&city=")
  })
})

describe("GET /workshops matches the mock", () => {
  test("every sort and the pages", async () => {
    await shops()
    for (const sort of ["rating", "newest", "bogus"])
      await shops(`?sort=${sort}`)
    await shops("?sort=nearest&lat=15.55&lng=32.53")
    await shops("?sort=nearest")
    await shops("?sort=nearest&lat=0&lng=32.53")
    await shops("?page=2&pageSize=4")
  })

  test("filters", async () => {
    await shops("?city=khartoum&verified=true")
    await shops("?service=oil-change")
    await shops("?service=brakes&sort=newest")
    await shops("?service=no-such-service")
    await shops("?q=workshop")
  })

  test("open now on a Sunday morning, at 17:59 and 18:00 (closed), and on a Friday", async () => {
    // Khartoum is UTC+2: 07:30 UTC is 09:30 there. Sunday is day 0, Friday day 5.
    const instants = [
      "2026-11-01T07:30:00Z",
      "2026-11-01T15:59:00Z",
      "2026-11-01T16:00:00Z",
      "2026-11-06T07:30:00Z",
    ]
    for (const instant of instants) {
      const now = new Date(instant)
      spyOn(Date, "now").mockReturnValue(now.getTime())
      spyOn(clock, "now").mockReturnValue(now)
      await shops("?openNow=true")
      await shops("?openNow=true&city=khartoum&sort=newest")
    }
  })
})

describe("GET /mechanics matches the mock", () => {
  test("every sort, with paid plans first, and the pages", async () => {
    await mechanics()
    for (const sort of ["rating", "experience", "newest", "bogus"])
      await mechanics(`?sort=${sort}`)
    await mechanics("?page=2&pageSize=4&sort=experience")
  })

  test("filters", async () => {
    await mechanics("?city=omdurman")
    await mechanics("?specialization=engine")
    await mechanics("?minYears=8&sort=experience")
    await mechanics("?minYears=abc")
    await mechanics("?available=true&verified=true")
    await mechanics("?q=hassan")
  })
})

describe("the detail pages match the mock", () => {
  test("every seeded business by slug", async () => {
    const [dealer] = await db.select().from(dealerships).limit(3)
    const [shop] = await db.select().from(workshops).limit(1)
    for (const row of await db
      .select({ slug: dealerships.slug })
      .from(dealerships))
      await expectParity(`/api/v1/dealerships/${row.slug}`)
    for (const row of await db.select({ slug: workshops.slug }).from(workshops))
      await expectParity(`/api/v1/workshops/${row.slug}`)
    await expectParity(`/api/v1/dealerships/${dealer?.slug}`)
    await expectParity(`/api/v1/workshops/${shop?.slug}`)
  })

  test("mechanics, an unknown slug and a slug of the wrong kind", async () => {
    const { mechanics: table } = await import(
      "~/modules/businesses/businesses.tables"
    )
    for (const row of await db.select({ slug: table.slug }).from(table))
      await expectParity(`/api/v1/mechanics/${row.slug}`)
    await expectParity("/api/v1/dealerships/nope")
    await expectParity("/api/v1/workshops/nope")
    await expectParity("/api/v1/mechanics/nope")
  })

  test("a banned owner leaves the lists, and the page opens flagged", async () => {
    const [dealer] = await db
      .select({ slug: dealerships.slug, ownerUserId: dealerships.ownerUserId })
      .from(dealerships)
      .where(eq(dealerships.status, "active"))
      .limit(1)
    await banOnBothSides(dealer?.ownerUserId ?? "")
    await dealers()
    await expectParity(`/api/v1/dealerships/${dealer?.slug}`)
  })
})

// The same account is banned in the api DB and in the mock's in-memory DB.
async function banOnBothSides(ownerUserId: string) {
  await db.update(user).set({ banned: true }).where(eq(user.id, ownerUserId))
  const { db: mock } = await import("../../../../web/src/mocks/db")
  const row = mock.users.find((u) => u.id === ownerUserId)
  if (row) row.banned = true
}
