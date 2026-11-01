import { runMigrations } from "../scripts/migrate"

// Every test talks to the test database, never the dev one.
const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error("TEST_DATABASE_URL is not set")
process.env.DATABASE_URL = url
// app.request() has no socket, so every test request comes from 127.0.0.1.
// Trusting it as a proxy lets a test pick its client IP with X-Forwarded-For.
process.env.TRUSTED_PROXIES = "127.0.0.1"
// Fixed provider apps, so social sign-in tests run against a stubbed provider
// whatever the owner put in .env (auth.social.test.ts).
process.env.GOOGLE_CLIENT_ID = "test-google-id"
process.env.GOOGLE_CLIENT_SECRET = "test-google-secret"
process.env.FACEBOOK_CLIENT_ID = "test-facebook-id"
process.env.FACEBOOK_CLIENT_SECRET = "test-facebook-secret"
// A throwaway Sign in with Apple key, so Apple is on in tests (auth.app.test.ts).
const appleKey = await crypto.subtle.generateKey(
  { name: "ECDSA", namedCurve: "P-256" },
  true,
  ["sign"]
)
const pkcs8 = await crypto.subtle.exportKey("pkcs8", appleKey.privateKey)
process.env.APPLE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\\n${Buffer.from(pkcs8).toString("base64")}\\n-----END PRIVATE KEY-----`
process.env.APPLE_CLIENT_ID = "test.apple.web"
process.env.APPLE_TEAM_ID = "TESTTEAM01"
process.env.APPLE_KEY_ID = "TESTKEY001"
process.env.APPLE_APP_BUNDLE_ID = "test.apple.app"

await runMigrations(url)
