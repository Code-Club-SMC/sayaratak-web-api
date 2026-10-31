import { SQL } from "bun"
import { drizzle } from "drizzle-orm/bun-sql"
import { env } from "~/env"
import * as schema from "~/shared/db/schema"

export const db = drizzle({
  client: new SQL({ url: env.DATABASE_URL, max: env.DB_POOL_MAX }),
  schema,
  // A17.4: camelCase in TypeScript, snake_case in SQL.
  casing: "snake_case",
})
