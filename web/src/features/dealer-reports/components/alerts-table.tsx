import { Link } from "@tanstack/react-router"
import { BookmarkIcon } from "lucide-react"

import { DataTable } from "@/components/app/data-table"
import { EmptyState } from "@/components/app/empty-state"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { routeHref, searchRoute } from "@/features/search/landing"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import type { DataColumn } from "@/lib/table"
import { cn } from "@/lib/utils"
import type { AlertsReport } from "@sayaratak/shared/schemas/reports-alerts"

type Row = AlertsReport["rows"][number]

// Each saved search (`cn` drops the base transparent border an outline link otherwise keeps): alerts on or off, new matches in the period and the compare window, and a link to its results.
export function AlertsTable({
  rows,
  loading,
}: {
  rows?: Row[]
  loading?: boolean
}) {
  const { t, locale } = useT()
  const num = (n: number) => (
    <span className="num">{formatNumber(n, locale)}</span>
  )
  const name = (r: Row) => (
    <div className="flex min-w-0 flex-col items-start gap-1">
      <span className="text-ui font-medium">
        <bdi>{r.name}</bdi>
      </span>
      <Badge variant={r.alerts ? "primary" : "muted"}>
        {t(r.alerts ? "reports.alerts_on" : "reports.alerts_off")}
      </Badge>
    </div>
  )
  const open = (r: Row) => (
    <a
      href={localeHref(
        routeHref(searchRoute({ ...r.params, page: 1 })),
        locale
      )}
      aria-label={t("dashboard.saved_searches_open_for", { name: r.name })}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      {t("dashboard.saved_searches_open")}
    </a>
  )
  const columns: DataColumn<Row>[] = [
    {
      id: "name",
      header: t("reports.col_search"),
      enableHiding: false,
      cell: ({ row }) => name(row.original),
    },
    {
      id: "matches",
      header: t("reports.col_matches"),
      meta: { align: "end" },
      cell: ({ row }) => num(row.original.matches),
    },
    {
      id: "previous",
      header: t("reports.col_matches_before"),
      meta: { align: "end" },
      cell: ({ row }) => num(row.original.previous),
    },
    {
      id: "open",
      header: t("reports.col_open"),
      enableHiding: false,
      cell: ({ row }) => open(row.original),
    },
  ]
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-body font-semibold">{t("reports.alerts_title")}</h2>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        label={t("reports.alerts_title")}
        loading={loading}
        mobileCard={(r) => (
          <div className="flex flex-col gap-3">
            {name(r)}
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-ui">
              <dt className="text-muted-foreground">
                {t("reports.col_matches")}
              </dt>
              <dd className="text-end">{num(r.matches)}</dd>
              <dt className="text-muted-foreground">
                {t("reports.col_matches_before")}
              </dt>
              <dd className="text-end">{num(r.previous)}</dd>
            </dl>
            <div>{open(r)}</div>
          </div>
        )}
        empty={
          <EmptyState
            icon={BookmarkIcon}
            title={t("reports.alerts_empty")}
            level={3}
            className="py-6"
            action={
              <Link
                to="/$locale/search"
                params={{ locale }}
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                {t("reports.alerts_empty_action")}
              </Link>
            }
          />
        }
        page={1}
        pageCount={1}
        hrefFor={() => ""}
        onPageChange={() => undefined}
      />
      <p className="text-caption text-muted-foreground">
        {t("reports.alerts_note")}
      </p>
    </section>
  )
}
