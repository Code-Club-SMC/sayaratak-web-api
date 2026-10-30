import { Hono } from "hono"

const v1 = new Hono()

export const app = new Hono()
  .get("/api/health/live", (c) => c.json({ ok: true }))
  .route("/api/v1", v1)
