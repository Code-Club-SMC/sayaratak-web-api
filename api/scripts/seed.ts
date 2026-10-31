import { settings } from "~/modules/content/content.tables"
import type { Executor } from "~/shared/db/tx"

import { buildSeed } from "../../web/src/mocks/seed"

/**
 * Writes the demo data from the mock's own `buildSeed()`, so ids and demo
 * accounts match the mock (A13). Each Phase 2 step adds its tables here.
 */
export async function seed(ex: Executor) {
  const { bankakAccount, ...rest } = buildSeed().settings
  await ex
    .insert(settings)
    .values({
      ...rest,
      bankakName: bankakAccount.name,
      bankakNumber: bankakAccount.number,
    })
    .onConflictDoNothing()
}

if (import.meta.main) {
  const { env } = await import("~/env")
  // A2: demo people and listings never reach production.
  if (env.APP_ENV === "production") {
    process.stderr.write("db:seed refuses to run when APP_ENV=production\n")
    process.exit(1)
  }
  const { db } = await import("~/shared/db/client")
  await seed(db)
}
