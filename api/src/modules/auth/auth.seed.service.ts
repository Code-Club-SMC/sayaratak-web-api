import type { SeedOwnerBatch } from "@sayaratak/shared/schemas/seed-batches"
import { seedOwnerBatchSchema } from "@sayaratak/shared/schemas/seed-batches"
import { APIError } from "better-auth/api"

import { db } from "~/shared/db/client"
import type { Executor, Transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"

import * as q from "./auth.queries"
import * as seed from "./auth.seed.queries"

const NO_NOTIFICATIONS = {
  messages: false,
  reviews: false,
  updates: false,
  savedSearchMatches: false,
  billing: false,
  announcements: false,
}

/** Inserts non-login fictional owners without credentials, sessions or verified claims. */
export async function insertSeedOwners(tx: Transaction, input: SeedOwnerBatch) {
  const batch = seedOwnerBatchSchema.parse(input)
  const ids: string[] = []
  for (const owner of [...batch.owners].sort((a, b) =>
    a.id.localeCompare(b.id)
  )) {
    const existing = await seed.lockSeedOwner(tx, owner.id)
    if (existing) fail.conflict()
    if (await q.getUserByEmail(tx, `${owner.id}@seed.invalid`)) fail.conflict()
    await seed.insertSeedOwner(tx, {
      id: owner.id,
      name: owner.name.ar,
      email: `${owner.id}@seed.invalid`,
      role: owner.role,
      cityId: owner.cityId,
      seedDatasetId: batch.datasetId,
      emailVerified: false,
      verifiedPhone: false,
      banned: false,
      onboardingDone: true,
      prefs: NO_NOTIFICATIONS,
      createdAt: new Date(batch.anchor),
      updatedAt: new Date(batch.anchor),
    })
    ids.push(owner.id)
  }
  return ids
}

/** Detects synthetic owners without exposing provenance to public consumers. */
export async function isSyntheticUser(ex: Executor, id: string) {
  return Boolean((await q.getUser(ex, id))?.seedDatasetId)
}

/** Verifies exact dataset ownership when resuming a committed batch. */
export async function isSeedOwner(
  ex: Executor,
  owner: { id: string; datasetId: string }
) {
  return (await q.getUser(ex, owner.id))?.seedDatasetId === owner.datasetId
}

/** Refuses session/account creation even for injected tokens or OAuth callbacks. */
export async function refuseSyntheticUser(id: string) {
  if (await isSyntheticUser(db, id))
    throw new APIError("FORBIDDEN", { code: "forbidden" })
}

/** Stops email auth before unfinished-account deletion, OTP storage or mail. */
export async function refuseSyntheticEmail(email: string) {
  if (
    email.endsWith(".invalid") ||
    (await q.getUserByEmail(db, email))?.seedDatasetId
  )
    throw new APIError("FORBIDDEN", { code: "forbidden" })
}

/** Rejects Better-Auth session responses, including injected preexisting sessions. */
export async function refuseSyntheticSessionResult(result: unknown) {
  if (!result || typeof result !== "object" || !("user" in result)) return
  const user = result.user
  if (!user || typeof user !== "object" || !("id" in user)) return
  if (typeof user.id === "string") await refuseSyntheticUser(user.id)
}

/** Rejects bearer tokens belonging to synthetic owners before endpoints run. */
export async function refuseSyntheticBearer(headers?: Headers | null) {
  const authHeader =
    headers?.get("authorization") || headers?.get("Authorization")
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return
  const token = authHeader.slice(7).trim().split(".")[0]
  if (!token) return
  const userId = await seed.getSessionUserIdByToken(db, token)
  if (userId) await refuseSyntheticUser(userId)
}
