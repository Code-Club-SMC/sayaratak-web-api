import { afterEach, beforeEach, expect, test } from "bun:test"
import { seedStatusSchema } from "@sayaratak/shared/schemas/admin-seed"
import { eq } from "drizzle-orm"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { session } from "~/modules/auth/auth.tables"

import { adminCaller } from "../../../tests/admin"
import { authPost, call, req, resetDb, signIn } from "../../../tests/helpers"

const ORIGINAL_ENABLED = env.ADMIN_SEED_ENABLED
const ORIGINAL_APP_ENV = env.APP_ENV

beforeEach(async () => {
  env.APP_ENV = "test"
  await resetDb()
})
afterEach(() => {
  env.ADMIN_SEED_ENABLED = ORIGINAL_ENABLED
  env.APP_ENV = ORIGINAL_APP_ENV
})

test("anonymous callers cannot inspect or prepare the seed catalog", async () => {
  expect((await req("/admin/seed")).status).toBe(401)
  expect((await req("/admin/seed/manifest")).status).toBe(401)
})

test("regular accounts cannot inspect or prepare the seed catalog", async () => {
  const viewer = await signIn("user")
  expect((await call(viewer, "/admin/seed", { method: "GET" })).status).toBe(
    403
  )
  expect(
    (await call(viewer, "/admin/seed/prepare", { method: "POST", body: {} }))
      .status
  ).toBe(403)
})

test("admin bearer tokens cannot access the seed catalog", async () => {
  const viewer = await signIn("admin")
  const response = await req("/admin/seed", {
    headers: { authorization: `Bearer ${viewer.token}` },
  })
  expect(response.status).toBe(403)
})

test("a pending email-code challenge is not an authenticated admin session", async () => {
  const response = await authPost("/sign-in/email", {
    email: "admin@demo.sy",
    password: "Demo1234",
  })
  const cookie = response.headers
    .getSetCookie()
    .map((line) => line.split(";")[0])
    .join("; ")
  const prepared = await req("/admin/seed/prepare", {
    method: "POST",
    headers: {
      cookie,
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: "{}",
  })
  expect(prepared.status).toBe(401)
})

test("an admin session without the required second step is forbidden", async () => {
  const viewer = await signIn("admin")
  await db
    .update(session)
    .set({ secondStep: false })
    .where(eq(session.userId, "u-admin"))
  const response = await call(viewer, "/admin/seed/prepare", {
    method: "POST",
    body: {},
  })
  expect(response.status).toBe(403)
})

test("disabled capability is explained to admins but preparation and download are refused", async () => {
  env.ADMIN_SEED_ENABLED = false
  const admin = adminCaller()
  const response = await admin("GET", "/admin/seed")
  expect(response.status).toBe(200)
  expect(seedStatusSchema.parse(await response.json()).capability).toEqual({
    enabled: false,
    missing: ["ADMIN_SEED_ENABLED"],
  })
  expect((await admin("POST", "/admin/seed/prepare", {})).status).toBe(403)
  expect((await admin("GET", "/admin/seed/manifest")).status).toBe(403)
})

test("anonymous and regular accounts cannot invoke seed execution or retry", async () => {
  for (const action of ["start", "retry"]) {
    expect(
      (await req(`/admin/seed/${action}`, { method: "POST" })).status
    ).toBe(401)
    const viewer = await signIn("user")
    expect(
      (
        await call(viewer, `/admin/seed/${action}`, {
          method: "POST",
          body: {},
        })
      ).status
    ).toBe(403)
  }
})

test("anonymous and regular accounts cannot invoke seed removal", async () => {
  expect((await req("/admin/seed/remove", { method: "POST" })).status).toBe(401)
  const viewer = await signIn("user")
  expect(
    (await call(viewer, "/admin/seed/remove", { method: "POST", body: {} }))
      .status
  ).toBe(403)
})
