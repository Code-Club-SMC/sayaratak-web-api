import { Hono } from "hono"
import { cors } from "hono/cors"
import { requestId } from "hono/request-id"
import { secureHeaders } from "hono/secure-headers"

import { env } from "~/env"
import { contentRoutes } from "~/modules/content/content.routes"
import { clientIp } from "~/shared/http/client-ip"
import { csrfOrigin } from "~/shared/http/csrf-origin"
import { onError, onNotFound } from "~/shared/http/errors"

// The Origin header never has a trailing slash; WEB_ORIGIN may.
const webOrigin = new URL(env.WEB_ORIGIN).origin

const v1 = new Hono().route("/", contentRoutes)

// Middleware in A3 order. The per-request log line comes with 10.4; the 500
// log line is in onError.
export const app = new Hono()
  .onError(onError)
  .notFound(onNotFound)
  .use(requestId())
  .use(clientIp(env.TRUSTED_PROXIES))
  .use(
    secureHeaders({
      // HSTS is set by Render's edge (A12).
      strictTransportSecurity: false,
      referrerPolicy: "strict-origin-when-cross-origin",
      // Web and api share one site (example.sd, api.example.sd), so web pages
      // may show images the api streams, such as private receipts.
      crossOriginResourcePolicy: "same-site",
    })
  )
  .use(async (c, next) => {
    await next()
    // A12: no-store unless a public reference read sets its own Cache-Control.
    if (!c.res.headers.has("Cache-Control"))
      c.header("Cache-Control", "no-store")
  })
  .use(
    cors({
      origin: webOrigin,
      credentials: true,
      allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
      allowHeaders: ["content-type"],
    })
  )
  .use(csrfOrigin(webOrigin))
  .get("/api/health/live", (c) => c.json({ ok: true }))
  .route("/api/v1", v1)
