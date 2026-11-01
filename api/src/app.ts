import { Hono } from "hono"
import { cors } from "hono/cors"
import { requestId } from "hono/request-id"
import { secureHeaders } from "hono/secure-headers"
import { z } from "zod"

import { env } from "~/env"
import { appVersion } from "~/shared/http/app-version"
import { clientIp } from "~/shared/http/client-ip"
import { csrfOrigin } from "~/shared/http/csrf-origin"
import { onError, onNotFound } from "~/shared/http/errors"
import { buildOpenApi } from "~/shared/openapi/build"
import { spec } from "~/shared/openapi/registry"
import { session } from "~/modules/auth/auth.middleware"
import { accountRoutes } from "~/modules/account/account.routes"
import { analyticsRoutes } from "~/modules/analytics/analytics.routes"
import { authRoutes } from "~/modules/auth/auth.routes"
import { contentRoutes } from "~/modules/content/content.routes"
import { listingsRoutes } from "~/modules/listings/listings.routes"
import { mapRoutes } from "~/modules/map/map.routes"
import { notificationsRoutes } from "~/modules/notifications/notifications.routes"
import { onboardingRoutes } from "~/modules/onboarding/onboarding.routes"
import { taxonomyRoutes } from "~/modules/taxonomy/taxonomy.routes"
import { uploadsRoutes } from "~/modules/uploads/uploads.routes"

// The Origin header never has a trailing slash; WEB_ORIGIN may.
const webOrigin = new URL(env.WEB_ORIGIN).origin

// Built once, on the first request: the router no longer changes by then.
let openApi: ReturnType<typeof buildOpenApi> | undefined

const v1 = new Hono()
  .use(session)
  .get(
    "/openapi.json",
    spec({
      summary: "This contract, OpenAPI 3.1",
      access: "public",
      responses: { 200: z.looseObject({ openapi: z.literal("3.1.0") }) },
    }),
    (c) => {
      openApi ??= buildOpenApi(app)
      return c.json(openApi)
    }
  )
  .route("/", authRoutes)
  .route("/", contentRoutes)
  .route("/", accountRoutes)
  .route("/", onboardingRoutes)
  .route("/", notificationsRoutes)
  .route("/", taxonomyRoutes)
  .route("/", uploadsRoutes)
  .route("/", listingsRoutes)
  .route("/", mapRoutes)
  .route("/", analyticsRoutes)

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
    // An answer carrying a cookie (a refreshed session) is never cacheable.
    if (!c.res.headers.has("Cache-Control") || c.res.headers.has("Set-Cookie"))
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
  .use(
    appVersion({
      ios: env.MIN_APP_VERSION_IOS,
      android: env.MIN_APP_VERSION_ANDROID,
    })
  )
  .use(csrfOrigin(webOrigin))
  .get("/api/health/live", (c) => c.json({ ok: true }))
  .route("/api/v1", v1)
