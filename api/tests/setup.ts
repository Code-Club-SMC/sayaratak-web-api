import { runMigrations } from "../scripts/migrate"

// Every test talks to the test database, never the dev one.
const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error("TEST_DATABASE_URL is not set")
process.env.DATABASE_URL = url

await runMigrations(url)
