import { expect, test } from "bun:test"
import { app } from "~/app"

test("GET /api/health/live answers ok", async () => {
  const res = await app.request("/api/health/live")
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ ok: true })
})
