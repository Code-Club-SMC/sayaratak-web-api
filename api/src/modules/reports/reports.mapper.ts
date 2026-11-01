import type { Report } from "@sayaratak/shared/schemas/admin"

import type { reports } from "./reports.tables"

type ReportRow = typeof reports.$inferSelect

/** A report as its reporter and the admin queue read it. Both ids are set while the listing and the reporter exist. */
export function toReport(row: ReportRow): Report {
  return {
    id: row.id,
    listingId: row.listingId ?? "",
    reporterId: row.reporterId ?? "",
    reason: row.reason,
    details: row.details ?? undefined,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    resolutionNote: row.resolutionNote ?? undefined,
  }
}
