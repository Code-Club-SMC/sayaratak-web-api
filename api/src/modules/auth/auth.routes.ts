import { Hono } from "hono"

import { auth, CLIENT_IP_HEADER } from "./auth.config"

export const authRoutes = new Hono()

// Better-Auth answers every /auth/* path itself (sign-up, sign-in, codes,
// sessions). `all` keeps these out of openapi.json: Better-Auth documents its
// own routes, and the apps read them there (A18).
authRoutes.all("/auth/*", (c) => {
  // Our A3 client IP replaces whatever the client sent in this header.
  const headers = new Headers(c.req.raw.headers)
  headers.set(CLIENT_IP_HEADER, c.get("clientIp"))
  return auth.handler(new Request(c.req.raw, { headers }))
})
