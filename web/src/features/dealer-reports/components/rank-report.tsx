import { useQuery } from "@tanstack/react-query"

import { PeriodNote } from "@/components/app/period-note"
import { SectionError } from "@/components/app/section-error"
import { StatCard } from "@/components/app/stat-card"
import { taxonomyQuery } from "@/features/listings/queries"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type { PeriodQuery } from "@sayaratak/shared/schemas/period"
import {
  RANK_METRICS,
  type RankRow,
} from "@sayaratak/shared/schemas/reports-rank"
import { rankReportQuery } from "../queries"

// Message keys are snake case.
const keyOf = (key: RankRow["key"]) =>
  key === "replyRate" ? "reply_rate" : key

// Where the business stands among listed businesses of its kind in its city (all Sudan under 5 there): the share of the others it beats per measure. Aggregate only: no other business is named (step 11.7-r8, owner 2026-11-19).
export function RankReport({
  role,
  query,
}: {
  role: "workshop" | "mechanic"
  query: PeriodQuery
}) {
  const { t, locale } = useT()
  const report = useQuery(rankReportQuery(query))
  const taxonomy = useQuery(taxonomyQuery).data
  const { data, isPending } = report
  if (report.isError && !data)
    return (
      <SectionError
        message={t("reports.load_error_tab")}
        onRetry={() => void report.refetch()}
      />
    )
  const city =
    taxonomy?.cities.find((c) => c.id === data?.cityId)?.name[locale] ?? ""
  const kind = t(`reports.rank_kind_${role}`)
  const peers = formatNumber(data?.peers ?? 0, locale)
  const value = (row: RankRow) => {
    if (row.value === null) return ""
    if (row.key === "replyRate") return `${formatNumber(row.value, locale)}%`
    return formatNumber(row.value, locale)
  }
  const emptyOf = (row: RankRow) =>
    row.state === "few"
      ? t("reports.rank_thin", { value: formatNumber(row.ranked, locale) })
      : t(`reports.rank_none_${keyOf(row.key)}`)
  return (
    <div className="flex flex-col gap-6">
      <PeriodNote period={data?.period} />
      {data && (
        <p className="text-ui text-muted-foreground">
          {data.scope === "city"
            ? t("reports.rank_scope_city", { peers, kind, city })
            : t("reports.rank_scope_country", { peers, kind, city })}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {(data?.metrics ?? []).map((row) => (
          <StatCard
            key={row.key}
            label={t(`reports.rank_${keyOf(row.key)}`)}
            value={row.percentile}
            display={
              row.percentile === null
                ? undefined
                : t("reports.rank_better", {
                    value: formatNumber(row.percentile, locale),
                  })
            }
            empty={emptyOf(row)}
            note={
              row.value === null
                ? undefined
                : t("reports.rank_yours", { value: value(row) })
            }
          />
        ))}
        {isPending &&
          RANK_METRICS.map((key) => (
            <StatCard
              key={key}
              label={t(`reports.rank_${keyOf(key)}`)}
              loading
            />
          ))}
      </div>
      <p className="text-caption text-muted-foreground">
        {t("reports.rank_note")}
      </p>
    </div>
  )
}
