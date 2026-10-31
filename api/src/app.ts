import { Hono } from "hono"

import { onError, onNotFound } from "~/shared/http/errors"

const v1 = new Hono()

export const app = new Hono()
  .onError(onError)
  .notFound(onNotFound)
  .get("/api/health/live", (c) => c.json({ ok: true }))
  .route("/api/v1", v1)
