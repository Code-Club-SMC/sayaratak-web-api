import { createHash } from "node:crypto"

import type {
  SeedOwner,
  SeedRecord,
} from "@sayaratak/shared/schemas/seed-manifest"

import type { Transaction } from "~/shared/db/tx"
import { fail } from "~/shared/http/errors"
import * as auth from "~/modules/auth/auth.seed.service"
import * as businesses from "~/modules/businesses/businesses.seed.service"
import * as listings from "~/modules/listings/listings.seed.service"

import * as q from "./admin-seed.install.queries"

export type OwnedRecord = {
  datasetId: string
  domain: "owner" | "listing" | "dealership" | "workshop" | "mechanic"
  record: SeedOwner | SeedRecord
  at: Date
}

/** Digests the canonical versioned descriptor used to prove owned replay. */
export function seedRecordDigest(record: SeedOwner | SeedRecord) {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex")
}

/** Proves both durable provenance and domain ownership before skipping replay. */
export async function hasOwnedSeedRecord(tx: Transaction, input: OwnedRecord) {
  const record = await q.getInstallRecord(tx, {
    datasetId: input.datasetId,
    domain: input.domain,
    recordId: input.record.id,
  })
  if (!record) return false
  if (
    record.recordDigest !== seedRecordDigest(input.record) ||
    record.outcome !== "owned"
  )
    fail.conflict()
  const ref = { id: input.record.id, datasetId: input.datasetId }
  const matches =
    input.domain === "owner"
      ? await auth.isSeedOwner(tx, ref)
      : await hasOwnedPublicRecord(tx, { ...ref, domain: input.domain })
  if (!matches) fail.conflict()
  return true
}

/** Writes provenance in the caller's transaction with the insert and checkpoint. */
export function recordSeedOwnership(tx: Transaction, input: OwnedRecord) {
  return q.insertInstallRecord(tx, {
    datasetId: input.datasetId,
    domain: input.domain,
    recordId: input.record.id,
    recordDigest: seedRecordDigest(input.record),
    createdAt: input.at,
  })
}

async function hasOwnedPublicRecord(
  tx: Transaction,
  ref: {
    id: string
    datasetId: string
    domain: Exclude<OwnedRecord["domain"], "owner">
  }
) {
  if (ref.domain === "listing") return listings.isSeedListing(tx, ref)
  return businesses.isSeedBusiness(tx, ref)
}
