import { afterAll, beforeAll, describe, spyOn, test } from "bun:test"
import { asc, eq } from "drizzle-orm"

import { db } from "~/shared/db/client"
import { clock } from "~/shared/time/clock"
import { listings } from "~/modules/listings/listings.tables"

import { bothSessions, resetDb } from "../../../tests/helpers"
import { expectParity } from "../../../tests/parity"

// Steps 11.7-r7 and r8 (moved out of analytics.parity.test.ts, which hit the file size limit).
// The mock counts UTC days and the api Khartoum days (UTC+2). At noon UTC they
// are the same date, so the two can be compared whatever time the suite runs.
// The time is fixed before the seeds are built, so their message times are fixed too.
const NOON = new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00Z`)

type As = "user" | "dealership" | "workshop" | "mechanic" | "admin"
const AS: As[] = ["user", "dealership", "workshop", "mechanic", "admin"]
const sessions = {} as Record<As, Awaited<ReturnType<typeof bothSessions>>>

function freeze() {
  spyOn(Date, "now").mockReturnValue(NOON.getTime())
  spyOn(clock, "now").mockReturnValue(NOON)
}

beforeAll(async () => {
  freeze()
  await resetDb()
  // Signing in (the admin's mailed code) needs the real clock; the sessions last two months.
  spyOn(Date, "now").mockRestore()
  spyOn(clock, "now").mockRestore()
  for (const as of AS) sessions[as] = await bothSessions(as)
  freeze()
})
afterAll(() => {
  spyOn(Date, "now").mockRestore()
  spyOn(clock, "now").mockRestore()
})

describe("step 11.7-r7 price position matches the mock", () => {
  test("the Price report per role, band and page", async () => {
    for (const as of ["user", "dealership", "workshop"] as const)
      for (const query of [
        "",
        "?band=below",
        "?band=around",
        "?band=above",
        "?band=unknown",
        "?page=2",
        "?band=nonsense&page=0",
      ])
        await expectParity(`/api/v1/me/reports/price${query}`, {
          init: { headers: sessions[as] },
        })
  })

  test("one listing: owner, admin, stranger, missing, signed out", async () => {
    for (const [as, owner] of [
      ["user", "u-omar"],
      ["dealership", "u-dealer"],
    ] as const) {
      const rows = await db
        .select({ id: listings.id })
        .from(listings)
        .where(eq(listings.ownerUserId, owner))
        .orderBy(asc(listings.id))
      for (const row of rows.slice(0, 5)) {
        const path = `/api/v1/listings/${row.id}/price`
        await expectParity(path, { init: { headers: sessions[as] } })
        await expectParity(path, { init: { headers: sessions.admin } })
      }
    }
    const [row] = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.ownerUserId, "u-dealer"))
      .orderBy(asc(listings.id))
    await expectParity(`/api/v1/listings/${row?.id}/price`, {
      init: { headers: sessions.user },
    })
    await expectParity("/api/v1/listings/zzzzz/price", {
      init: { headers: sessions.user },
    })
    await expectParity(`/api/v1/listings/${row?.id}/price`)
    await expectParity("/api/v1/me/reports/price")
  })
})

describe("step 11.7-r8 city rank matches the mock", () => {
  test("every role, presets, custom and year compare", async () => {
    for (const as of AS)
      for (const query of [
        "",
        "?range=7d",
        "?range=90d&compare=year",
        "?from=2020-01-01T00:00&to=2020-01-02T00:00",
      ])
        await expectParity(`/api/v1/me/reports/rank${query}`, {
          init: { headers: sessions[as] },
        })
  })

  test("signed out", async () => {
    await expectParity("/api/v1/me/reports/rank")
  })
})
