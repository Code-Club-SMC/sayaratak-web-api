import type { SeedCapability } from "@sayaratak/shared/schemas/admin-seed"

import type { Env } from "~/env"

const STORAGE_KEYS = [
  "CLOUDINARY_URL",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
] satisfies (keyof Env)[]

/** Explains unavailable prerequisites without revealing secret values or using fake hosted storage. */
export function getSeedCapability(configuration: Env): SeedCapability {
  const missing: SeedCapability["missing"] = []
  if (!configuration.ADMIN_SEED_ENABLED) missing.push("ADMIN_SEED_ENABLED")
  if (configuration.NODE_ENV === "test") {
    if (configuration.APP_ENV !== "test") missing.push("TEST_ENVIRONMENT")
    return { enabled: missing.length === 0, missing }
  }
  for (const key of STORAGE_KEYS) if (!configuration[key]) missing.push(key)
  return { enabled: missing.length === 0, missing }
}
