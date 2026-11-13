import {
  seedManifestSchema,
  type SeedManifest,
} from "@sayaratak/shared/schemas/seed-manifest"

import {
  buildSeedBusinesses,
  buildSeedOwners,
} from "./admin-seed.businesses.service"
import { buildSeedParts } from "./admin-seed.parts.service"
import { buildSeedAssets } from "./admin-seed.prompts.service"
import { buildSeedVehicles } from "./admin-seed.vehicles.service"

/** Returns a validated, portable catalog, without reading env, mocks, time or a database. */
export function buildSeedManifest(): SeedManifest {
  const records = [
    ...buildSeedVehicles(),
    ...buildSeedParts(),
    ...buildSeedBusinesses(),
  ]
  return seedManifestSchema.parse({
    version: "sudan-marketplace-v1",
    owners: buildSeedOwners(),
    records,
    assets: buildSeedAssets(records),
  })
}

/** Binds preparation, image handoff and installation to the same ordered catalog. */
export function getManifestDigest(manifest: SeedManifest) {
  return new Bun.CryptoHasher("sha256")
    .update(JSON.stringify(manifest))
    .digest("hex")
}
