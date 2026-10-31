import { runMigrations } from "../scripts/migrate"

// Every test talks to the test database, never the dev one.
const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error("TEST_DATABASE_URL is not set")
process.env.DATABASE_URL = url
// Fixed provider apps, so social sign-in tests run against a stubbed provider
// whatever the owner put in .env (auth.social.test.ts).
process.env.GOOGLE_CLIENT_ID = "test-google-id"
process.env.GOOGLE_CLIENT_SECRET = "test-google-secret"
process.env.FACEBOOK_CLIENT_ID = "test-facebook-id"
process.env.FACEBOOK_CLIENT_SECRET = "test-facebook-secret"

await runMigrations(url)
