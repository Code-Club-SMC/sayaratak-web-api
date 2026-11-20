import { useId } from "react"
import { CalendarCheckIcon } from "lucide-react"

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
import { formatPrice, formatShortDate } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import { localeHref } from "@/lib/navigation"
import { useNow } from "@/lib/now"
import type { RevenueReport } from "@sayaratak/shared/schemas/reports-revenue"

type Row = RevenueReport["expiring"][number]

const DAY_MS = 86_400_000
const businessPage = {
  dealership: "dealerships",
  workshop: "workshops",
  mechanic: "mechanics",
} as const

// The business in its admin table, else the person's account (same as the subscribers table).
const pathOf = (r: Row) =>
  r.role !== "user" && r.role !== "admin" && r.businessId
    ? `/admin/${businessPage[r.role]}?id=${r.businessId}`
    : `/admin/users?id=${r.userId}`

// Paid plans ending in the next 30 days, soonest first, so the admin can ask the holder to renew (step 11.7-r11).
export function ExpiringTable({
  rows,
  loading,
}: {
  rows?: Row[]
  loading?: boolean
}) {
  const { t, locale } = useT()
  const id = useId()
  const now = useNow()
  const unit = formatPrice(0, locale).unit
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 panel p-5">
      <h2 id={id} className="text-body font-semibold">
        {t("reports.revenue_expiring")}
      </h2>
      <p className="text-caption text-muted-foreground">
        {t("reports.revenue_expiring_note")}
      </p>
      {loading || !rows ? (
        <Skeleton className="h-40" aria-hidden="true" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarCheckIcon}
          title={t("reports.revenue_expiring_empty")}
          body={t("reports.revenue_expiring_empty_body")}
          level={3}
          className="py-6"
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("reports.revenue_col_account")}</TableHead>
              <TableHead>{t("reports.revenue_col_ends")}</TableHead>
              <TableHead className="text-end">
                {t("reports.revenue_col_price", { unit })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.subscriptionId}>
                <TableCell className="whitespace-normal">
                  <span className="flex flex-col">
                    <a
                      href={localeHref(pathOf(r), locale)}
                      className="inline-flex min-h-11 items-center text-ui font-medium underline-offset-4 motion-color hover:text-primary hover:underline"
                    >
                      <bdi>{r.name[locale] || r.userId}</bdi>
                    </a>
                    <span className="text-caption text-muted-foreground">
                      {t(`dashboard.role_${r.role}`)} ·{" "}
                      <bdi>{r.planName[locale]}</bdi>
                    </span>
                  </span>
                </TableCell>
                <TableCell>
                  <span className="flex flex-col">
                    <span className="text-ui">
                      {formatShortDate(r.endsAt, locale)}
                    </span>
                    <span className="text-caption text-muted-foreground">
                      {t("billing.ends_in", {
                        count: Math.max(
                          0,
                          Math.round((Date.parse(r.endsAt) - now) / DAY_MS)
                        ),
                      })}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-end num">
                  {formatPrice(r.price, locale).amount}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}
