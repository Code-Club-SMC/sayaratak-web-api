import { ReceiptIcon } from "lucide-react"

import { DataTable } from "@/components/app/data-table"
import { EmptyState } from "@/components/app/empty-state"
import { PaymentStatusBadge } from "@/features/billing/components/payment-status-badge"
import { formatShortDate } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { DataColumn } from "@/lib/table"
import type { SpendingReport } from "@sayaratak/shared/schemas/reports-spending"
import { MoneyCell } from "./promotion-cells"

type Row = SpendingReport["payments"][number]

// Every receipt sent in the period, newest first, with its review state.
export function SpendingTable({
  rows,
  loading,
}: {
  rows?: Row[]
  loading?: boolean
}) {
  const { t, locale } = useT()
  const item = (r: Row) => (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-ui font-medium">
        <bdi>{r.itemLabel[locale]}</bdi>
      </span>
      <span className="text-caption text-muted-foreground">
        {t(`reports.spend_type_${r.itemType}`)}
      </span>
    </div>
  )
  const columns: DataColumn<Row>[] = [
    {
      id: "date",
      header: t("billing.col_date"),
      enableHiding: false,
      cell: ({ row }) => formatShortDate(row.original.createdAt, locale),
    },
    {
      id: "item",
      header: t("billing.col_item"),
      cell: ({ row }) => item(row.original),
    },
    {
      id: "amount",
      header: t("billing.col_amount"),
      meta: { align: "end" },
      cell: ({ row }) => <MoneyCell amount={row.original.amount} />,
    },
    {
      id: "status",
      header: t("billing.col_status"),
      cell: ({ row }) => <PaymentStatusBadge status={row.original.status} />,
    },
  ]
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-body font-semibold">{t("reports.receipts_title")}</h2>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        label={t("reports.receipts_title")}
        loading={loading}
        mobileCard={(r) => (
          <div className="flex flex-col gap-2">
            {item(r)}
            <div className="flex items-center justify-between gap-3 text-ui">
              <span className="text-muted-foreground">
                {formatShortDate(r.createdAt, locale)}
              </span>
              <MoneyCell amount={r.amount} />
            </div>
            <div>
              <PaymentStatusBadge status={r.status} />
            </div>
          </div>
        )}
        empty={
          <EmptyState
            icon={ReceiptIcon}
            title={t("reports.receipts_empty")}
            level={3}
            className="py-6"
          />
        }
        page={1}
        pageCount={1}
        hrefFor={() => ""}
        onPageChange={() => undefined}
      />
      <p className="text-caption text-muted-foreground">
        {t("reports.spend_note")}
      </p>
    </section>
  )
}
