import { afterAll, beforeAll, describe, spyOn, test } from "bun:test"

import { clock } from "~/shared/time/clock"

import { bothSessions, resetDb } from "../../../tests/helpers"
import { expectParity } from "../../../tests/parity"

// Step 11.7-r10. The mock counts UTC days for its events and the api Khartoum
// days; at noon UTC they are the same date. The time is fixed before the seeds
// are built, so seeded times and activity days are fixed too.
const NOON = new Date(`${new Date().toISOString().slice(0, 10)}T12:00:00Z`)
const sessions = {} as Record<
  "admin" | "user",
  Awaited<ReturnType<typeof bothSessions>>
>

function freeze() {
  spyOn(Date, "now").mockReturnValue(NOON.getTime())
  spyOn(clock, "now").mockReturnValue(NOON)
}

beforeAll(async () => {
  freeze()
  await resetDb()
  // Signing in (the admin's mailed code) needs the real clock.
  spyOn(Date, "now").mockRestore()
  spyOn(clock, "now").mockRestore()
  sessions.admin = await bothSessions("admin")
  sessions.user = await bothSessions("user")
  freeze()
})
afterAll(() => {
  spyOn(Date, "now").mockRestore()
  spyOn(clock, "now").mockRestore()
})

const PERIODS = [
  "",
  "?range=7d",
  "?range=90d&compare=year",
  "?from=2026-01-01T00:00&to=2026-01-02T12:00",
  "?range=nonsense",
]

describe("steps 11.7-r10 to r12b admin Insights match the mock", () => {
  for (const tab of ["marketplace", "users", "revenue", "trust", "ads"])
    test(`${tab} per period, refused for others`, async () => {
      for (const query of PERIODS)
        await expectParity(`/api/v1/admin/insights/${tab}${query}`, {
          init: { headers: sessions.admin },
        })
      await expectParity(`/api/v1/admin/insights/${tab}`, {
        init: { headers: sessions.user },
      })
      await expectParity(`/api/v1/admin/insights/${tab}`)
    })
})
