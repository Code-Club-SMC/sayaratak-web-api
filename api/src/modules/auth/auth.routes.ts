import {
  notificationPrefsSchema,
  okSchema,
} from "@sayaratak/shared/schemas/api"
import {
  notificationPrefsInputSchema,
  passwordInputSchema,
  profilePatchSchema,
} from "@sayaratak/shared/schemas/inputs"
import { userSchema } from "@sayaratak/shared/schemas/user"
import { type Context, Hono } from "hono"

import { validate } from "~/shared/http/validate"
import { spec } from "~/shared/openapi/registry"

import {
  changePassword,
  getPrefs,
  updatePrefs,
  updateProfile,
} from "./auth.account.service"
import { auth, CLIENT_IP_HEADER } from "./auth.config"
import { deleteAccount } from "./auth.deletion.service"
import { requireUser } from "./auth.middleware"
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

authRoutes.patch(
  "/me",
  spec({
    summary: "Save the settings form; a new email needs its code",
    access: "user",
    responses: { 200: userSchema },
    errors: [
      "unauthenticated",
      "banned",
      "validation",
      "exists",
      "otp_invalid",
      "code_expired",
      "contact_required",
    ],
  }),
  requireUser,
  validate.json(profilePatchSchema),
  async (c) => {
    const { me, headers } = await updateProfile(
      c.get("user"),
      c.req.valid("json"),
      c.req.raw.headers
    )
    passCookies(c, headers)
    return c.json(me)
  }
)

authRoutes.post(
  "/me/password",
  spec({
    summary: "Change the password, or set a first one",
    access: "user",
    responses: { 200: okSchema },
    errors: ["unauthenticated", "banned", "validation", "invalid_credentials"],
  }),
  requireUser,
  validate.json(passwordInputSchema),
  async (c) => {
    const headers = await changePassword(
      c.get("user"),
      c.req.valid("json"),
      c.req.raw.headers
    )
    passCookies(c, headers)
    return c.json({ ok: true })
  }
)

authRoutes.delete(
  "/me",
  spec({
    summary: "Delete the account for good",
    access: "user",
    responses: { 200: okSchema },
    errors: ["unauthenticated", "banned", "forbidden"],
  }),
  requireUser,
  async (c) => {
    const headers = await deleteAccount(c.get("user"), c.req.raw.headers)
    passCookies(c, headers)
    return c.json({ ok: true })
  }
)

authRoutes.get(
  "/me/notification-prefs",
  spec({
    summary: "The notification switches",
    access: "user",
    responses: { 200: notificationPrefsSchema },
    errors: ["unauthenticated", "banned"],
  }),
  requireUser,
  (c) => c.json(getPrefs(c.get("user")))
)

authRoutes.patch(
  "/me/notification-prefs",
  spec({
    summary: "Save the notification switches",
    access: "user",
    responses: { 200: notificationPrefsSchema },
    errors: ["unauthenticated", "banned", "validation"],
  }),
  requireUser,
  validate.json(notificationPrefsInputSchema),
  async (c) => {
    const prefs = await updatePrefs(c.get("user"), c.req.valid("json"))
    return c.json(prefs)
  }
)

// Better-Auth's new or cleared session cookie, on our own answer.
function passCookies(c: Context, headers: Headers) {
  for (const cookie of headers.getSetCookie()) {
    c.header("set-cookie", cookie, { append: true })
  }
}
