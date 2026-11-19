import { useState, type ReactNode } from "react"
import { ImageIcon } from "lucide-react"

import { BarChartCard } from "@/components/app/bar-chart-card"
import { DataTable } from "@/components/app/data-table"
import { EmptyState } from "@/components/app/empty-state"
import { MediaImage } from "@/components/app/media-image"
import { Button } from "@/components/ui/button"
import { reportChart } from "@/features/analytics/chart-props"
import { formatNumber, formatShortDate } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { DataColumn } from "@/lib/table"
import type { Period } from "@sayaratak/shared/schemas/period"
import type { CampaignReportRow } from "@sayaratak/shared/schemas/reports-promotions"
import { MoneyCell } from "./promotion-cells"

// Paid banners that ran in the period: views, clicks and click rate in the period, cost per click over the whole campaign, and one campaign's daily numbers as a chart.
export function CampaignsSection({
  rows,
  period,
  loading,
  emptyAction,
}: {
  rows?: CampaignReportRow[]
  period?: Period
  loading?: boolean
  // Shown in the empty state, such as a link to start a campaign.
  emptyAction?: ReactNode
}) {
  const { t, locale } = useT()
  const [picked, setPicked] = useState<string | null>(null)
  const shown = rows?.find((r) => r.id === picked) ?? rows?.[0]
  const num = (n: number) => formatNumber(n, locale)
  const pages = (r: CampaignReportRow) =>
    r.pages.map((p) => t(`ads.page_${p}`)).join(locale === "ar" ? "، " : ", ")
  const banner = (r: CampaignReportRow) => (
    <div className="flex min-w-0 items-center gap-3">
      <MediaImage
        src={r.imageUrl}
        alt=""
        sizes="96px"
        className="h-12 w-24 shrink-0 rounded-lg"
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-ui font-medium md:max-w-xs md:truncate">
          {pages(r)}
        </span>
        <span className="text-caption text-muted-foreground">
          {t("reports.date_range", {
            from: formatShortDate(r.startsAt, locale),
            to: formatShortDate(r.endsAt, locale),
          })}
        </span>
      </div>
    </div>
  )
  const showButton = (r: CampaignReportRow) => (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={shown?.id === r.id}
      onClick={() => setPicked(r.id)}
    >
      {t("reports.campaign_show")}
    </Button>
  )
  const ctr = (r: CampaignReportRow) =>
    r.ctr === null ? "—" : `${formatNumber(r.ctr, locale)}%`
  const columns: DataColumn<CampaignReportRow>[] = [
    {
      id: "banner",
      header: t("reports.col_banner"),
      enableHiding: false,
      cell: ({ row }) => banner(row.original),
    },
    {
      id: "views",
      header: t("analytics.col_views"),
      meta: { align: "end" },
      cell: ({ row }) => num(row.original.impressions),
    },
    {
      id: "clicks",
      header: t("reports.col_clicks"),
      meta: { align: "end" },
      cell: ({ row }) => num(row.original.clicks),
    },
    {
      id: "ctr",
      header: t("reports.col_ctr"),
      meta: { align: "end" },
      cell: ({ row }) => <bdi dir="ltr">{ctr(row.original)}</bdi>,
    },
    {
      id: "paid",
      header: t("reports.col_paid"),
      meta: { align: "end" },
      cell: ({ row }) => <MoneyCell amount={row.original.amount} />,
    },
    {
      id: "cpc",
      header: t("reports.col_cpc"),
      meta: { align: "end" },
      cell: ({ row }) => <MoneyCell amount={row.original.costPerClick} />,
    },
    {
      id: "show",
      header: t("reports.col_daily"),
      cell: ({ row }) => showButton(row.original),
    },
  ]
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-body font-semibold">
        {t("reports.campaigns_title")}
      </h2>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        label={t("reports.campaigns_title")}
        loading={loading}
        mobileCard={(r) => (
          <div className="flex flex-col gap-2">
            {banner(r)}
            <p className="text-ui text-muted-foreground">
              {t("reports.campaign_line", {
                views: num(r.impressions),
                clicks: num(r.clicks),
              })}{" "}
              · <bdi dir="ltr">{ctr(r)}</bdi>
            </p>
            <div>{showButton(r)}</div>
          </div>
        )}
        empty={
          <EmptyState
            icon={ImageIcon}
            title={t("reports.campaigns_empty")}
            action={emptyAction}
            level={3}
            className="py-6"
          />
        }
        page={1}
        pageCount={1}
        hrefFor={() => ""}
        onPageChange={() => undefined}
      />
      {shown && (
        <BarChartCard
          title={t("reports.campaign_chart", { pages: pages(shown) })}
          series={[
            { key: "impressions", label: t("analytics.series_views") },
            { key: "clicks", label: t("reports.col_clicks") },
          ]}
          csvName={t("reports.campaigns_title")}
          {...reportChart({
            t,
            period,
            rows: shown.daily.map(({ date, ...rest }) => ({
              day: date,
              ...rest,
            })),
          })}
        />
      )}
    </section>
  )
}
