import { useLocation, useNavigate } from "@tanstack/react-router"
import type { UseQueryResult } from "@tanstack/react-query"
import { CarIcon } from "lucide-react"

import { ChipSingleSelect } from "@/components/app/chip-single-select"
import { DataTable } from "@/components/app/data-table"
import { EmptyState } from "@/components/app/empty-state"
import { PriceText } from "@/components/app/price-text"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import type { DataColumn } from "@/lib/table"
import {
  priceFilterSchema,
  type PriceReport,
  type PriceReportRow,
} from "@sayaratak/shared/schemas/reports-price"
import { searchString, type ReportsSearch } from "../schemas"
import { ListingTitleCell } from "./listing-cells"
import { PriceBandCell, PriceRange } from "./price-cells"
import { PriceReportCard } from "./price-report-card"

// The live listings against the market, biggest gap first; the band filter and page come from the URL and are worked out by the server.
export function PriceReportTable({
  search,
  report,
}: {
  search: ReportsSearch
  report: UseQueryResult<PriceReport>
}) {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const rows = report.data?.rows
  const summary = report.data?.summary
  const go = (next: Partial<ReportsSearch>, replace = true) =>
    void navigate({
      to: ".",
      search: (prev: Record<string, unknown>) => ({ ...prev, ...next }),
      replace,
      resetScroll: false,
      viewTransition: false,
    })
  const hrefFor = (page: number) =>
    localeHref(`${pathname}?${searchString({ ...search, page })}`, locale)
  const columns: DataColumn<PriceReportRow>[] = [
    {
      id: "listing",
      header: t("analytics.col_listing"),
      enableHiding: false,
      cell: ({ row }) => <ListingTitleCell row={row.original} />,
    },
    {
      id: "price",
      header: t("reports.col_your_price"),
      meta: { align: "end" },
      cell: ({ row }) => (
        <PriceText
          price={row.original.price}
          period={row.original.rentPeriod}
          size="table"
        />
      ),
    },
    {
      id: "median",
      header: t("reports.col_market_price"),
      meta: { align: "end" },
      cell: ({ row }) =>
        row.original.position.median === null ? (
          <span aria-label={t("reports.price_no_market")}>—</span>
        ) : (
          <PriceText price={row.original.position.median} size="table" />
        ),
    },
    {
      id: "band",
      header: t("reports.col_position"),
      cell: ({ row }) => (
        <div className="flex flex-col gap-1">
          <PriceBandCell position={row.original.position} />
          {row.original.position.state === "ok" && (
            <span className="text-caption text-muted-foreground">
              {t("reports.price_similar", {
                value: formatNumber(row.original.position.comparables, locale),
              })}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "range",
      header: t("reports.col_middle_half"),
      meta: { align: "end" },
      cell: ({ row }) => <PriceRange position={row.original.position} />,
    },
  ]
  const options = priceFilterSchema.options.map((value) => ({
    value,
    label:
      value === "all"
        ? t("reports.filter_all")
        : t("reports.filter_count", {
            label: t(`reports.price_filter_${value}`),
            count: formatNumber(summary?.[value] ?? 0, locale),
          }),
  }))
  return (
    <DataTable
      columns={columns}
      data={rows?.items}
      getRowId={(r) => r.id}
      label={t("reports.price_table_label")}
      loading={report.isPending}
      error={report.isError && !report.data}
      onRetry={() => void report.refetch()}
      filters={
        <ChipSingleSelect
          legend={t("reports.price_filter_legend")}
          hideLegend
          options={options}
          value={search.band}
          onChange={(value) =>
            go({ band: priceFilterSchema.parse(value), page: undefined })
          }
        />
      }
      mobileCard={(r) => <PriceReportCard row={r} />}
      empty={
        <EmptyState
          icon={CarIcon}
          title={t(
            search.band === "all"
              ? "reports.price_empty"
              : "reports.empty_filtered"
          )}
          level={3}
          className="py-6"
        />
      }
      page={search.page}
      pageCount={Math.ceil((rows?.total ?? 0) / (rows?.pageSize ?? 20))}
      hrefFor={hrefFor}
      onPageChange={(page) => go({ page }, false)}
    />
  )
}
