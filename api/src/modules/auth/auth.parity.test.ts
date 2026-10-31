import { beforeAll, test } from "bun:test"

import {
  DEMO_ACCOUNTS,
  type DemoAccount,
  resetDb,
  signIn,
} from "../../../tests/helpers"
import { expectParity } from "../../../tests/parity"

beforeAll(resetDb)

// Demo account to its seeded id. The mock reads its `sy_session` cookie (the
// user id), the api Better-Auth's; one request carries both.
const IDS: Record<DemoAccount, string> = {
  user: "u-omar",
  dealership: "u-dealer",
  workshop: "u-workshop",
  mechanic: "u-mechanic",
  admin: "u-admin",
  new: "u-new",
}

for (const as of DEMO_ACCOUNTS) {
  const id = IDS[as]
  test(`GET /me as ${as} matches the mock`, async () => {
    const { cookie } = await signIn(as)
    await expectParity("/api/v1/me", {
      init: { headers: { cookie: `${cookie}; sy_session=${id}` } },
    })
  })
}

test("GET /me signed out matches the mock (null)", async () => {
  await expectParity("/api/v1/me")
})
