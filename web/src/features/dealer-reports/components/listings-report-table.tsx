import { useLocation, useNavigate } from "@tanstack/react-router"
import type { UseQueryResult } from "@tanstack/react-query"
import { CarIcon } from "lucide-react"

import { ChipSingleSelect } from "@/components/app/chip-single-select"
import { DataTable } from "@/components/app/data-table"
import { EmptyState } from "@/components/app/empty-state"
import { formatDate, formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import type { DataColumn } from "@/lib/table"
import {
  listingsFilterSchema,
  listingsSortSchema,
  type ListingsReport,
  type ListingsReportRow,
} from "@sayaratak/shared/schemas/reports"
import { searchString, type ReportsSearch } from "../schemas"
import { ListingStateBadge, ListingTitleCell, RateText } from "./listing-cells"
import { ListingReportCard } from "./listing-report-card"

// Every approved listing with the period's numbers; filter chips (weak-listing flags, ending soon), sort and page come from the URL and are worked out by the server.
export function ListingsReportTable({
  search,
  report,
}: {
  search: ReportsSearch
  report: UseQueryResult<ListingsReport>
}) {
  const { t, locale } = useT()
  const navigate = useNavigate()
  const pathname = useLocation({ select: (l) => l.pathname })
  const rows = report.data?.rows
  const flagged = report.data?.summary.flagged
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
  const num = (n: number) => formatNumber(n, locale)
  const columns: DataColumn<ListingsReportRow>[] = [
    {
      id: "listing",
      header: t("analytics.col_listing"),
      enableHiding: false,
      cell: ({ row }) => <ListingTitleCell row={row.original} />,
    },
    {
      id: "status",
      header: t("reports.col_status"),
      cell: ({ row }) => <ListingStateBadge row={row.original} />,
    },
    {
      id: "days",
      header: t("reports.col_days_live"),
      meta: { sortKey: "days", align: "end" },
      cell: ({ row }) => num(row.original.daysLive),
    },
    {
      id: "views",
      header: t("analytics.col_views"),
      meta: { sortKey: "views", align: "end" },
      cell: ({ row }) => num(row.original.views),
    },
    {
      id: "contacts",
      header: t("analytics.col_contacts"),
      meta: { sortKey: "contacts", align: "end" },
      cell: ({ row }) => num(row.original.contacts),
    },
    {
      id: "rate",
      header: t("reports.col_rate"),
      meta: { sortKey: "rate", align: "end" },
      cell: ({ row }) => <RateText rate={row.original.contactRate} />,
    },
    {
      id: "expires",
      header: t("reports.col_expires"),
      meta: { sortKey: "expires" },
      cell: ({ row }) => formatDate(row.original.expiresAt, locale),
    },
  ]
  const options = listingsFilterSchema.options.map((value) => ({
    value,
    label:
      value === "all" || value === "expiring"
        ? t(`reports.filter_${value}`)
        : t("reports.filter_count", {
            label: t(`reports.flag_${value}`),
            count: num(flagged?.[value] ?? 0),
          }),
  }))
  return (
    <DataTable
      columns={columns}
      data={rows?.items}
      getRowId={(r) => r.id}
      label={t("reports.table_label")}
      loading={report.isPending}
      error={report.isError && !report.data}
      onRetry={() => void report.refetch()}
      sort={search.sort}
      onSortChange={(sort) =>
        go({ sort: listingsSortSchema.parse(sort), page: undefined })
      }
      filters={
        <ChipSingleSelect
          legend={t("reports.filter_legend")}
          hideLegend
          options={options}
          value={search.filter}
          onChange={(value) =>
            go({
              filter: listingsFilterSchema.parse(value),
              page: undefined,
            })
          }
        />
      }
      mobileCard={(r) => <ListingReportCard row={r} />}
      empty={
        <EmptyState
          icon={CarIcon}
          title={t(
            search.filter === "all"
              ? "reports.empty_title"
              : "reports.empty_filtered"
          )}
          body={
            search.filter === "all" ? t("reports.empty_title_body") : undefined
          }
          onClear={
            search.filter === "all" ? undefined : () => go({ filter: "all" })
          }
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
