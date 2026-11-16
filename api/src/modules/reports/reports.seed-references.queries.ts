import { inArray } from "drizzle-orm"

import type { Transaction } from "~/shared/db/tx"

import { reports } from "./reports.tables"

export async function findListingReports(
  tx: Transaction,
  listingIds: string[]
) {
  if (!listingIds.length) return []
  return tx
    .select({
      id: reports.id,
      listingId: reports.listingId,
    })
    .from(reports)
    .where(inArray(reports.listingId, listingIds))
}

export async function findReporterReports(tx: Transaction, ownerIds: string[]) {
  if (!ownerIds.length) return []
  return tx
    .select({
      id: reports.id,
      reporterId: reports.reporterId,
    })
    .from(reports)
    .where(inArray(reports.reporterId, ownerIds))
}
