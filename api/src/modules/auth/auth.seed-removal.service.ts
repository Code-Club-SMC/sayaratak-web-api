import type {
  SeedRemovalResult,
  SeedRemovalScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./auth.seed-removal.queries"

export async function removeSeedRecords(
  tx: Transaction,
  scope: SeedRemovalScope
): Promise<SeedRemovalResult> {
  const protectedSet = new Set(scope.orderedProtectedIds)
  const rows = await q.findOwnedSeedUsers(tx, scope.orderedOwnedIds)
  const rowMap = new Map(rows.map((r) => [r.id, r]))

  const toDelete: string[] = []
  const alreadyMissingIds: string[] = []
  const retained: Array<{ id: string; reason: string }> = []

  for (const id of scope.orderedOwnedIds) {
    const row = rowMap.get(id)
    if (!row) {
      alreadyMissingIds.push(id)
      continue
    }
    if (protectedSet.has(id)) {
      retained.push({ id, reason: "has_real_references" })
    } else {
      toDelete.push(id)
    }
  }

  await q.deleteSeedUserRows(tx, toDelete)
  return {
    domain: "owner",
    deletedIds: toDelete,
    alreadyMissingIds,
    retained,
  }
}
