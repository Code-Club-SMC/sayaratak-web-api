import { Link } from "@tanstack/react-router"

import { MediaImage } from "@/components/app/media-image"
import { StatusBadge } from "@/components/app/status-badge"
import { Badge } from "@/components/ui/badge"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { ListingsReportRow } from "@sayaratak/shared/schemas/reports"

// Cover and title linking to the public page, with the row's weak-listing flags under it.
export function ListingTitleCell({ row }: { row: ListingsReportRow }) {
  const { locale } = useT()
  return (
    <div className="flex min-w-0 items-center gap-3">
      <MediaImage
        src={row.coverUrl}
        alt=""
        sizes="48px"
        className="size-12 shrink-0 rounded-lg"
      />
      <div className="flex min-w-0 flex-col gap-1">
        <Link
          to="/$locale/listing/$slug"
          params={{ locale, slug: row.slug }}
          className="text-ui font-medium hover:text-primary md:max-w-xs md:truncate"
        >
          <bdi>{row.title}</bdi>
        </Link>
        <ListingFlags row={row} />
      </div>
    </div>
  )
}

// Live listings show their sale status; an approved listing past its end date reads Expired.
export function ListingStateBadge({ row }: { row: ListingsReportRow }) {
  const { t } = useT()
  const open = row.status === "available" || row.status === "reserved"
  return open && !row.live ? (
    <Badge variant="muted">{t("manager.expired")}</Badge>
  ) : (
    <StatusBadge status={row.status} />
  )
}

function ListingFlags({ row }: { row: ListingsReportRow }) {
  const { t } = useT()
  if (row.flags.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1">
      {row.flags.map((flag) => (
        <li key={flag}>
          <Badge variant="warning">{t(`reports.flag_${flag}`)}</Badge>
        </li>
      ))}
    </ul>
  )
}

export function RateText({ rate }: { rate: number | null }) {
  const { t, locale } = useT()
  return rate === null ? (
    <span aria-label={t("analytics.no_conversion")}>—</span>
  ) : (
    <bdi dir="ltr">{formatNumber(rate, locale)}%</bdi>
  )
}
