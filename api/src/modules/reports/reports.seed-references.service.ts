import type {
  SeedReference,
  SeedReferenceScope,
} from "~/modules/admin-seed/admin-seed.references.types"
import type { Transaction } from "~/shared/db/tx"

import * as q from "./reports.seed-references.queries"

export async function getSeedReferences(
  tx: Transaction,
  scope: SeedReferenceScope
): Promise<SeedReference[]> {
  const references: SeedReference[] = []
  const listingRows = await q.findListingReports(tx, scope.listingIds)
  for (const row of listingRows) {
    if (row.listingId) {
      references.push({
        referencingDomain: "reports",
        referencingId: row.id,
        referencedDomain: "listing",
        referencedId: row.listingId,
        reason: "report_references_listing",
      })
    }
  }
  const reporterRows = await q.findReporterReports(tx, scope.ownerIds)
  for (const row of reporterRows) {
    if (row.reporterId) {
      references.push({
        referencingDomain: "reports",
        referencingId: row.id,
        referencedDomain: "owner",
        referencedId: row.reporterId,
        reason: "report_filed_by_owner",
      })
    }
  }
  return references
}
