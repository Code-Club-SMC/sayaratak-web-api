import { expect, test } from "bun:test"
import { app } from "~/app"

test("GET /api/health/live answers ok", async () => {
  const res = await app.request("/api/health/live")
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
})

test("an unknown route answers 404 not_found", async () => {
  const res = await app.request("/api/v1/nope")
  expect(res.status).toBe(404)
  expect(await res.json()).toEqual({ code: "not_found", message: "not_found" })
})
