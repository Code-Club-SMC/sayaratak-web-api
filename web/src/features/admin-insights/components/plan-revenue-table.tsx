import { useId } from "react"
import { ReceiptIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatNumber, formatPrice } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { RevenueReport } from "@sayaratak/shared/schemas/reports-revenue"

// Approved plan money per plan in the period, most money first (step 11.7-r11). Plans of different audiences can share a name, so the audience sits under it.
export function PlanRevenueTable({
  rows,
  loading,
}: {
  rows?: RevenueReport["byPlan"]
  loading?: boolean
}) {
  const { t, locale } = useT()
  const id = useId()
  const unit = formatPrice(0, locale).unit
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 panel p-5">
      <h2 id={id} className="text-body font-semibold">
        {t("reports.revenue_by_plan")}
      </h2>
      {loading || !rows ? (
        <Skeleton className="h-40" aria-hidden="true" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ReceiptIcon}
          title={t("reports.revenue_by_plan_empty")}
          level={3}
          className="py-6"
        />
      ) : (
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>{t("reports.revenue_col_plan")}</TableHead>
              <TableHead className="text-end">
                {t("reports.revenue_col_receipts")}
              </TableHead>
              <TableHead className="text-end">
                {t("reports.revenue_col_price", { unit })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.planId}>
                <TableCell className="whitespace-normal">
                  <span className="flex flex-col">
                    <span className="text-ui font-medium">
                      <bdi>{r.name[locale]}</bdi>
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {t(`dashboard.role_${r.audience}`)}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-end num">
                  {formatNumber(r.count, locale)}
                </TableCell>
                <TableCell className="text-end num">
                  {formatPrice(r.amount, locale).amount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
