import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, bearer, emailOTP, twoFactor } from "better-auth/plugins"

import { env } from "~/env"
import { db } from "~/shared/db/client"
import * as schema from "~/shared/db/schema"

/**
 * Better-Auth (A6). Step 2.2 holds only what shapes the tables: the plugins
 * and the domain columns on `user`. Step 3.1 adds the rest of A6 and mounts it;
 * until then nothing serves these routes.
 *
 * Regenerate the tables after changing fields or plugins:
 * `bunx auth@1.7.10 generate --config src/modules/auth/auth.config.ts --output src/modules/auth/auth.tables.ts`,
 * then put back the hand edits listed at the top of auth.tables.ts.
 */
export const auth = betterAuth({
  basePath: "/api/v1/auth",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: { enabled: true, requireEmailVerification: true },
  rateLimit: { enabled: true, storage: "database" },
  user: {
    additionalFields: {
      phone: { type: "string", required: false },
      verifiedPhone: { type: "boolean", defaultValue: false, input: false },
      avatarUploadId: { type: "string", required: false, input: false },
      cityId: { type: "string", required: false, input: false },
      locale: { type: "string", defaultValue: "ar", input: false },
      onboardingDone: { type: "boolean", defaultValue: false, input: false },
      interests: { type: "string[]", defaultValue: [], input: false },
      prefs: { type: "json", required: true, input: false },
      chosenPlanId: { type: "string", required: false, input: false },
    },
  },
  plugins: [
    // ponytail: 3.2 wires the outbox sender; auth is not mounted before 3.1.
    emailOTP({ sendVerificationOTP: async () => undefined }),
    twoFactor(),
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    bearer(),
  ],
})
