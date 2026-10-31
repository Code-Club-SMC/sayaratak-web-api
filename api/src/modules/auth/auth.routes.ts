import { userSchema } from "@sayaratak/shared/schemas/user"
import { Hono } from "hono"

import { spec } from "~/shared/openapi/registry"

import { auth, CLIENT_IP_HEADER } from "./auth.config"
import { getMe } from "./auth.service"

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

authRoutes.get(
  "/me",
  spec({
    summary: "The signed-in account, or null when signed out",
    access: "public",
    responses: { 200: userSchema.nullable() },
  }),
  async (c) => {
    const me = await getMe(c.get("viewer"))
    return c.json(me)
  }
)
