import { MegaphoneIcon } from "lucide-react"

import { DataTable } from "@/components/app/data-table"
import { EmptyState } from "@/components/app/empty-state"
import { formatNumber, formatShortDate } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { DataColumn } from "@/lib/table"
import type { PromotionReportRow } from "@sayaratak/shared/schemas/reports-promotions"
import { BeforeDuring, MoneyCell, PromotionTitleCell } from "./promotion-cells"

// Each promotion that ran in the period: views and contacts per day before and during it, the contacts it added and what each one cost.
export function PromotionsTable({
  rows,
  loading,
}: {
  rows?: PromotionReportRow[]
  loading?: boolean
}) {
  const { t, locale } = useT()
  const extra = (r: PromotionReportRow) =>
    r.extraContacts === null ? "—" : formatNumber(r.extraContacts, locale)
  const columns: DataColumn<PromotionReportRow>[] = [
    {
      id: "listing",
      header: t("analytics.col_listing"),
      enableHiding: false,
      cell: ({ row }) => <PromotionTitleCell row={row.original} />,
    },
    {
      id: "dates",
      header: t("reports.col_ran"),
      cell: ({ row }) =>
        t("reports.date_range", {
          from: formatShortDate(row.original.startsAt, locale),
          to: formatShortDate(row.original.endsAt, locale),
        }),
    },
    {
      id: "views",
      header: t("reports.col_views_per_day"),
      meta: { align: "end" },
      cell: ({ row }) => <BeforeDuring row={row.original} measure="views" />,
    },
    {
      id: "contacts",
      header: t("reports.col_contacts_per_day"),
      meta: { align: "end" },
      cell: ({ row }) => <BeforeDuring row={row.original} measure="contacts" />,
    },
    {
      id: "extra",
      header: t("reports.col_extra"),
      meta: { align: "end" },
      cell: ({ row }) => <span className="num">{extra(row.original)}</span>,
    },
    {
      id: "paid",
      header: t("reports.col_paid"),
      meta: { align: "end" },
      cell: ({ row }) => <MoneyCell amount={row.original.amount} />,
    },
    {
      id: "cost",
      header: t("reports.col_cost_extra"),
      meta: { align: "end" },
      cell: ({ row }) => (
        <MoneyCell amount={row.original.costPerExtraContact} />
      ),
    },
  ]
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-body font-semibold">{t("reports.promos_title")}</h2>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        label={t("reports.promos_title")}
        loading={loading}
        mobileCard={(r) => (
          <div className="flex flex-col gap-2">
            <PromotionTitleCell row={r} />
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-ui">
              <dt className="text-muted-foreground">
                {t("reports.col_views_per_day")}
              </dt>
              <dd className="text-end">
                <BeforeDuring row={r} measure="views" />
              </dd>
              <dt className="text-muted-foreground">
                {t("reports.col_extra")}
              </dt>
              <dd className="text-end num">{extra(r)}</dd>
              <dt className="text-muted-foreground">
                {t("reports.col_cost_extra")}
              </dt>
              <dd className="text-end">
                <MoneyCell amount={r.costPerExtraContact} />
              </dd>
            </dl>
          </div>
        )}
        empty={
          <EmptyState
            icon={MegaphoneIcon}
            title={t("reports.promos_empty")}
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
        {t("reports.promos_note")}
      </p>
    </section>
  )
}
