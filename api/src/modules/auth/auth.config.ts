import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, bearer, emailOTP, twoFactor } from "better-auth/plugins"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import { ALL_PREFS } from "~/shared/db/defaults"
import * as schema from "~/shared/db/schema"
import { send } from "~/shared/mail/send"

import { mailCode } from "./auth.mail.service"

// 600 s and 5 tries: the web code step says "10 minutes" and "5 tries";
// Better-Auth's defaults are 300 and 3.
const OTP_SECONDS = 600
const OTP_TRIES = 5
// Per IP on each code route. Better-Auth's 3 a minute would cut the 5 tries
// short, and phones share IPs (A12); 3.6 sets the final per-email limits.
const OTP_RATE = { window: 60, max: 10 }
// A6: 60 days, extended once a day on use.
const SESSION_SECONDS = 60 * 24 * 3600
const SESSION_REFRESH_SECONDS = 24 * 3600
// Set by `authRoutes` from our own `clientIp` (A3), never by the client.
export const CLIENT_IP_HEADER = "x-sy-client-ip"

const isProduction = env.APP_ENV === "production"

/**
 * The one Better-Auth instance (A6), served under /api/v1/auth/* by
 * auth.routes.ts. Social providers come with 3.4, the hooks (password rules,
 * login throttle) with 3.6, the admin step with 3.7.
 *
 * Regenerate the tables after changing fields or plugins:
 * `bunx --bun auth@1.7.10 generate --config src/modules/auth/auth.config.ts --output src/modules/auth/auth.tables.ts`,
 * then put back the hand edits listed at the top of auth.tables.ts.
 */
export const auth = betterAuth({
  basePath: "/api/v1/auth",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  trustedOrigins: [new URL(env.WEB_ORIGIN).origin],
  // Admin plugin HTTP routes we never expose; our admin routes call auth.api.* (A6).
  disabledPaths: [
    "/admin/impersonate-user",
    "/admin/stop-impersonating",
    "/admin/set-role",
    "/admin/create-user",
    "/admin/remove-user",
    "/admin/set-user-password",
    "/admin/update-user",
  ],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: { autoSignInAfterVerification: true },
  session: {
    expiresIn: SESSION_SECONDS,
    updateAge: SESSION_REFRESH_SECONDS,
  },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
      verifiedPhone: { type: "boolean", defaultValue: false, input: false },
      avatarUploadId: { type: "string", required: false, input: false },
      cityId: { type: "string", required: false, input: false },
      locale: { type: "string", defaultValue: "ar", input: false },
      onboardingDone: { type: "boolean", defaultValue: false, input: false },
      interests: { type: "string[]", defaultValue: [], input: false },
      prefs: { type: "json", defaultValue: ALL_PREFS, input: false },
      chosenPlanId: { type: "string", required: false, input: false },
    },
  },
  advanced: {
    cookiePrefix: "sy",
    useSecureCookies: isProduction,
    defaultCookieAttributes: { sameSite: "lax", httpOnly: true },
    crossSubDomainCookies: {
      enabled: isProduction,
      domain: env.COOKIE_DOMAIN,
    },
    // Better-Auth reads only our header, which carries the A3 client IP, so a
    // forged X-Forwarded-For cannot dodge its limits.
    ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
  },
  rateLimit: { enabled: true, storage: "database" },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: OTP_SECONDS,
      allowedAttempts: OTP_TRIES,
      rateLimit: OTP_RATE,
      sendVerificationOnSignUp: true,
      overrideDefaultEmailVerification: true,
      // Sign-up needs a name and password (/sign-up/email); a code alone
      // never creates an account.
      disableSignUp: true,
      // A database dump never holds a live code (A9).
      storeOTP: "hashed",
      // Not awaited (A6): the answer time must not tell whether the email exists.
      sendVerificationOTP: async (mail, ctx) => {
        mailCode(mail, ctx?.request)
      },
    }),
    twoFactor({
      otpOptions: {
        sendOTP: async ({ user, otp }) => {
          send.adminCode(user, otp)
        },
      },
    }),
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    bearer(),
  ],
})
