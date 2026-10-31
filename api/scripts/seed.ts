import { settings } from "~/modules/content/content.tables"
import * as taxonomy from "~/modules/taxonomy/taxonomy.tables"
import type { Executor } from "~/shared/db/tx"

import { seedListings } from "./seed-listings"
import { seedPeople } from "./seed-people"
import { seedSocial } from "./seed-social"

import { buildSeed } from "../../web/src/mocks/seed"

/**
 * Writes the demo data from the mock's own `buildSeed()`, so ids and demo
 * accounts match the mock (A13). Each Phase 2 step adds its tables here.
 */
export async function seed(ex: Executor) {
  const data = buildSeed()
  await seedTaxonomy(ex, data)
  await seedPeople(ex, data)
  await seedListings(ex, data)
  await seedSocial(ex, data)
  const { bankakAccount, ...rest } = data.settings
  await ex
    .insert(settings)
    .values({
      ...rest,
      bankakName: bankakAccount.name,
      bankakNumber: bankakAccount.number,
    })
    .onConflictDoNothing()
}

// Parents before children; rows go in array order, so `position` keeps the mock's order.
async function seedTaxonomy(ex: Executor, data: ReturnType<typeof buildSeed>) {
  const { cities, districts, makes, models, ...lists } = data.taxonomy
  await ex
    .insert(taxonomy.countries)
    .values(data.countries)
    .onConflictDoNothing()
  await ex
    .insert(taxonomy.cities)
    .values(cities.map(({ center, ...city }) => ({ ...city, ...center })))
    .onConflictDoNothing()
  await ex.insert(taxonomy.districts).values(districts).onConflictDoNothing()
  await ex
    .insert(taxonomy.vehicleTypes)
    .values(lists.vehicleTypes)
    .onConflictDoNothing()
  await ex.insert(taxonomy.makes).values(makes).onConflictDoNothing()
  await ex.insert(taxonomy.models).values(models).onConflictDoNothing()
  await ex
    .insert(taxonomy.partCategories)
    .values(lists.partCategories)
    .onConflictDoNothing()
  await ex
    .insert(taxonomy.specializations)
    .values(lists.specializations)
    .onConflictDoNothing()
  await ex
    .insert(taxonomy.serviceTemplates)
    .values(lists.serviceTemplates)
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
