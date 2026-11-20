import { useId, type ReactNode } from "react"
import { ImageIcon } from "lucide-react"

import { EmptyState } from "@/components/app/empty-state"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatNumber, formatShortDate } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { AdRow, PageFill } from "@sayaratak/shared/schemas/reports-ads"

function Section({
  title,
  loading,
  children,
}: {
  title: string
  loading?: boolean
  children: ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 panel p-5">
      <h2 id={id} className="text-body font-semibold">
        {title}
      </h2>
      {loading ? <Skeleton className="h-40" aria-hidden="true" /> : children}
    </section>
  )
}

const usePct = () => {
  const { locale } = useT()
  return (n: number | null) =>
    n === null ? "—" : `${formatNumber(n, locale)}%`
}

// Slot fill per page that sells banner space (step 11.7-r12b): approved campaigns only.
export function PagesFill({
  rows,
  loading,
}: {
  rows?: PageFill[]
  loading?: boolean
}) {
  const { t, locale } = useT()
  const pct = usePct()
  return (
    <Section title={t("reports.ads_pages_title")} loading={loading || !rows}>
      <Table>
        <TableHeader className="bg-muted">
          <TableRow>
            <TableHead>{t("reports.ads_col_page")}</TableHead>
            <TableHead className="text-end">
              {t("reports.ads_col_slots")}
            </TableHead>
            <TableHead className="text-end">
              {t("reports.ads_col_campaigns")}
            </TableHead>
            <TableHead className="text-end">
              {t("reports.ads_col_slot_days")}
            </TableHead>
            <TableHead className="text-end">
              {t("reports.ads_col_fill")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows?.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="whitespace-normal">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-ui">{t(`ads.page_${p.id}`)}</span>
                  {!p.enabled && (
                    <Badge variant="muted">{t("reports.ads_page_off")}</Badge>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-end num">
                {formatNumber(p.slots, locale)}
              </TableCell>
              <TableCell className="text-end num">
                {formatNumber(p.campaigns, locale)}
              </TableCell>
              <TableCell className="text-end num">
                {formatNumber(p.slotDays, locale)}
              </TableCell>
              <TableCell className="text-end num">
                <bdi dir="ltr">{pct(p.fill.pct)}</bdi>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  )
}

// Approved campaigns and admin banners of the period, most views first.
export function AdsList({
  rows,
  loading,
}: {
  rows?: AdRow[]
  loading?: boolean
}) {
  const { t, locale } = useT()
  const pct = usePct()
  const sep = locale === "ar" ? "، " : ", "
  const where = (a: AdRow) =>
    a.kind === "campaign"
      ? a.pages.map((p) => t(`ads.page_${p}`)).join(sep)
      : t(`admin.banners_placement_${a.placement}`)
  return (
    <Section title={t("reports.ads_list_title")} loading={loading || !rows}>
      {rows?.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={t("reports.ads_list_empty")}
          level={3}
          className="py-6"
        />
      ) : (
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>{t("reports.ads_col_ad")}</TableHead>
              <TableHead className="text-end">
                {t("analytics.col_views")}
              </TableHead>
              <TableHead className="text-end">
                {t("reports.col_clicks")}
              </TableHead>
              <TableHead className="text-end">{t("reports.col_ctr")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows?.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="whitespace-normal">
                  <span className="flex flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <bdi className="text-ui font-medium">{a.name}</bdi>
                      <Badge variant="muted">
                        {t(`reports.ads_kind_${a.kind}`)}
                      </Badge>
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {where(a)} ·{" "}
                      {t("reports.date_range", {
                        from: formatShortDate(a.startsAt, locale),
                        to: formatShortDate(a.endsAt, locale),
                      })}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-end num">
                  {formatNumber(a.views, locale)}
                </TableCell>
                <TableCell className="text-end num">
                  {formatNumber(a.clicks, locale)}
                </TableCell>
                <TableCell className="text-end num">
                  <bdi dir="ltr">{pct(a.ctr)}</bdi>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  )
}
