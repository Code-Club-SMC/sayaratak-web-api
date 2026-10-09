import { normalizePhone } from "@/lib/phone"
import {
  identifySchema,
  notificationPrefsSchema,
  okSchema,
  draftSchema,
} from "@/schemas/api"
import {
  draftInputSchema,
  forgotInputSchema,
  identifyInputSchema,
  loginInputSchema,
  notificationPrefsInputSchema,
  oauthInputSchema,
  otpSendInputSchema,
  otpVerifyInputSchema,
  passwordInputSchema,
  profilePatchSchema,
  registerInputSchema,
  resetInputSchema,
} from "@/schemas/inputs"
import { defaultPrefs, slugify } from "@/mocks/seed/util"

import { db, find, insert, newId } from "../db"
import { removeAccount } from "../account"
import { fail, needUser, route, withSession } from "../http"
import { nowIso, publicUser } from "../lib"
import type { UserRow } from "../types"

const WINDOW_MS = 10 * 60_000
const MAX_FAILS = 5
const isEmail = (id: string) => id.includes("@")
const normalize = (id: string) =>
  isEmail(id) ? id.trim().toLowerCase() : normalizePhone(id)
export const findByIdentifier = (id: string) => {
  const key = normalize(id)
  return db.users.find((u) => (isEmail(id) ? u.email === key : u.phone === key))
}

function throttled(key: string) {
  const recent = (db.attempts.get(key) ?? []).filter(
    (t) => Date.now() - t < WINDOW_MS
  )
  db.attempts.set(key, recent)
  const first = recent[0]
  if (recent.length >= MAX_FAILS && first !== undefined) {
    throw fail(429, "too_many_attempts", undefined, {
      retryAfter: Math.ceil((first + WINDOW_MS - Date.now()) / 1000),
    })
  }
}

route("GET", "/me", ({ user }) => (user ? publicUser(user) : null))

route("POST", "/auth/identify", async (c) => {
  const user = findByIdentifier((await c.body(identifyInputSchema)).identifier)
  return identifySchema.parse({
    exists: Boolean(user),
    hasPassword: Boolean(user?.password),
  })
})

route("POST", "/auth/login", async (c) => {
  const { identifier, password } = await c.body(loginInputSchema)
  const key = normalize(identifier)
  throttled(key)
  const user = findByIdentifier(identifier)
  if (!user || user.password !== password) {
    db.attempts.set(key, [...(db.attempts.get(key) ?? []), Date.now()])
    throw fail(401, "invalid_credentials")
  }
  if (user.banned) throw fail(403, "banned")
  db.attempts.delete(key)
  return withSession(user.id, publicUser(user))
})

route("POST", "/auth/register", async (c) => {
  const { identifier, fullName, password } = await c.body(registerInputSchema)
  if (findByIdentifier(identifier)) throw fail(409, "exists")
  const email = isEmail(identifier)
  const user: UserRow = {
    id: newId("u"),
    role: "user",
    fullName,
    password,
    ...(email
      ? { email: normalize(identifier) }
      : { phone: normalize(identifier) }),
    verifiedPhone: false,
    verifiedEmail: false,
    banned: false,
    createdAt: nowIso(),
    onboardingDone: false,
    interests: [],
    locale: "ar",
    prefs: { ...defaultPrefs },
  }
  insert(db.users, user)
  return withSession(user.id, publicUser(user), 201)
})

route("POST", "/auth/oauth/:provider", async (c) => {
  if (c.params.provider !== "google" && c.params.provider !== "facebook")
    throw fail(404, "not_found")
  const { accountId } = await c.body(oauthInputSchema)
  const email = `${c.params.provider}-${slugify(accountId)}@demo.sy`
  let user = db.users.find((u) => u.email === email)
  if (!user) {
    user = {
      id: newId("u"),
      role: "user",
      fullName: accountId,
      email,
      password: null,
      verifiedPhone: false,
      verifiedEmail: true,
      banned: false,
      createdAt: nowIso(),
      onboardingDone: false,
      interests: [],
      locale: "ar",
      prefs: { ...defaultPrefs },
    }
    insert(db.users, user)
  }
  if (user.banned) throw fail(403, "banned")
  return withSession(user.id, publicUser(user))
})

route("POST", "/auth/otp/send", async (c) => {
  const { identifier } = await c.body(otpSendInputSchema)
  // Signed in, the code is for a new phone or email, so one that another account owns is refused up front.
  const owner = identifier ? findByIdentifier(identifier) : undefined
  if (c.user && owner && owner.id !== c.user.id) throw fail(409, "exists")
  return okSchema.parse({ ok: true })
})
// The code 123456 always passes; a signed-in user gets the matching verified flag.
route("POST", "/auth/otp/verify", async (c) => {
  const { code, identifier } = await c.body(otpVerifyInputSchema)
  if (code !== "123456")
    throw fail(422, "otp_invalid", { code: "auth.otp_invalid" })
  // Signed out (code instead of a password): the code signs in the matching account.
  const user = c.user ?? (identifier ? findByIdentifier(identifier) : undefined)
  if (user) {
    if (user.banned) throw fail(403, "banned")
    if (identifier ? isEmail(identifier) : !user.phone)
      user.verifiedEmail = true
    else user.verifiedPhone = true
    return c.user ? publicUser(user) : withSession(user.id, publicUser(user))
  }
  return okSchema.parse({ ok: true })
})

route("POST", "/auth/forgot", async (c) => {
  const { identifier } = await c.body(forgotInputSchema)
  db.resetUserId = findByIdentifier(identifier)?.id ?? null
  return okSchema.parse({ ok: true })
})
// The demo token resets the account of the last forgot request, else the demo user.
route("POST", "/auth/reset", async (c) => {
  const { token, password } = await c.body(resetInputSchema)
  const user =
    token === "demo-reset" &&
    (db.users.find((u) => u.id === db.resetUserId) ??
      findByIdentifier("+249912345601"))
  if (!user) throw fail(422, "invalid_token")
  user.password = password
  for (const id of [user.email, user.phone])
    if (id) db.attempts.delete(normalize(id))
  db.resetUserId = null
  return okSchema.parse({ ok: true })
})
route("POST", "/auth/logout", () => withSession(null, { ok: true }))

// A new phone or email is saved only with the code sent to it (always 123456), and counts as verified then. "" removes one, but never the last. "" on the city or the avatar clears it.
route("PATCH", "/me", async (c) => {
  const user = needUser(c)
  const { code, email, phone, cityId, avatarUrl, locale, ...rest } =
    await c.body(profilePatchSchema)
  const change = (
    field: "email" | "phone",
    verified: "verifiedEmail" | "verifiedPhone",
    value: string | undefined
  ) => {
    if (value === undefined || value === user[field]) return
    if (value === "") {
      if (!user[field === "email" ? "phone" : "email"])
        throw fail(422, "contact_required")
      delete user[field]
      user[verified] = false
      return
    }
    if (db.users.some((u) => u.id !== user.id && u[field] === value))
      throw fail(409, "exists")
    if (code !== "123456")
      throw fail(422, "otp_invalid", { code: "auth.otp_invalid" })
    user[field] = value
    user[verified] = true
  }
  change("email", "verifiedEmail", email)
  change("phone", "verifiedPhone", phone)
  Object.assign(user, rest)
  if (locale) user.locale = locale
  if (cityId !== undefined) user.cityId = cityId || undefined
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl || undefined
  return publicUser(user)
})
route("POST", "/me/password", async (c) => {
  const user = needUser(c)
  const { currentPassword, newPassword } = await c.body(passwordInputSchema)
  if (user.password && user.password !== currentPassword)
    throw fail(401, "invalid_credentials")
  user.password = newPassword
  return okSchema.parse({ ok: true })
})
route("DELETE", "/me", (c) => {
  const user = needUser(c)
  if (user.role === "admin") throw fail(403, "forbidden")
  removeAccount(user)
  return withSession(null, { ok: true })
})
route("GET", "/me/notification-prefs", (c) =>
  notificationPrefsSchema.parse(needUser(c).prefs)
)
route("PATCH", "/me/notification-prefs", async (c) => {
  const user = needUser(c)
  const patch = await c.body(notificationPrefsInputSchema)
  Object.assign(user.prefs, patch)
  return notificationPrefsSchema.parse(user.prefs)
})

route("GET", "/drafts/:key", (c) => {
  const user = needUser(c)
  return draftSchema.parse({
    data: find(db.drafts, `${user.id}:${c.params.key}`)?.data ?? {},
  })
})
route("PATCH", "/drafts/:key", async (c) => {
  const user = needUser(c)
  const { data } = await c.body(draftInputSchema)
  const id = `${user.id}:${c.params.key}`
  const row = find(db.drafts, id)
  if (row) row.data = data
  else insert(db.drafts, { id, userId: user.id, key: c.params.key ?? "", data })
  return draftSchema.parse({ data })
})
