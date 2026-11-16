import type {
  SeedReference,
  SeedReferenceScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./devices.seed-references.queries"

export async function getSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const rows = await q.findDeviceUserReferences(tx, scope.ownerIds)
  return rows.map((row) => ({
    referencingDomain: "devices",
    referencingId: row.id,
    referencedDomain: "owner",
    referencedId: row.userId,
    reason: "registered_device_for_owner",
  }))
}
