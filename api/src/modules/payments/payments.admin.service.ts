import type { Executor } from "~/shared/db/tx"
import { pageParams } from "~/shared/http/page"
import { clock } from "~/shared/time/clock"
import { monthOf } from "~/shared/time/khartoum"
import { uploadUrl } from "~/modules/uploads/uploads.service"

import { toPayment } from "./payments.mapper"
import * as q from "./payments.admin.queries"

const PAGE_SIZE = { default: 20, max: 100 }

/** Raw query values of `GET /admin/payments`, read as the mock reads them. */
export type PaymentsQuery = Partial<
  Record<
    "status" | "userId" | "id" | "q" | "page" | "pageSize" | "limit",
    string
  >
>

/**
 * `GET /admin/payments`: a page of payments newest first (filters `status`,
 * `userId`, `id` and `q`), with the strip above the table: money approved this
 * Khartoum month and what waits for review.
 */
export async function listAdminPayments(ex: Executor, query: PaymentsQuery) {
  const { page, pageSize: size } = pageParams(query, PAGE_SIZE)
  // Independent reads.
  const [found, approvedThisMonth, waiting] = await Promise.all([
    q.listForAdmin(ex, {
      status: query.status || undefined,
      userId: query.userId || undefined,
      id: query.id || undefined,
      q: query.q?.trim().toLowerCase() || undefined,
      page: { offset: (page - 1) * size, size },
    }),
    q.sumApprovedInMonth(ex, monthOf(clock.now())),
    q.sumPending(ex),
  ])
  const items = await Promise.all(
    found.rows.map(async (row) =>
      toPayment(row, (await uploadUrl(ex, row.receiptUploadId)) ?? "")
    )
  )
  return {
    items,
    total: found.total,
    page,
    pageSize: size,
    summary: {
      approvedThisMonth,
      pendingCount: waiting.count,
      pendingAmount: waiting.amount,
    },
  }
}
