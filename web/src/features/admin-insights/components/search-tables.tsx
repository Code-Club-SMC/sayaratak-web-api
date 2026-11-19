import { useId, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { SearchXIcon } from "lucide-react"

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
import { taxonomyQuery } from "@/features/listings/queries"
import { formatNumber } from "@/lib/format"
import { useT } from "@/lib/i18n/use-t"
import type {
  SearchMakeRow,
  SearchMissRow,
} from "@sayaratak/shared/schemas/reports-search"

function Section(props: {
  title: string
  note?: string
  loading?: boolean
  empty?: boolean
  children: ReactNode
}) {
  const { t } = useT()
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-2 rounded-xl bg-card p-5"
    >
      <h2 id={id} className="text-body font-semibold">
        {props.title}
      </h2>
      {props.note && (
        <p className="text-caption text-muted-foreground">{props.note}</p>
      )}
      {props.loading ? (
        <Skeleton className="h-40" aria-hidden="true" />
      ) : props.empty ? (
        <EmptyState
          icon={SearchXIcon}
          title={t("reports.search_empty")}
          level={3}
          className="py-6"
        />
      ) : (
        props.children
      )}
    </section>
  )
}

/** Names of taxonomy ids in the current language; an unknown id shows as itself. */
export function useNames() {
  const { locale } = useT()
  const tx = useQuery(taxonomyQuery).data
  const of =
    (list: { id: string; name: Record<string, string> }[] = []) =>
    (id: string) =>
      list.find((x) => x.id === id)?.name[locale] ?? id
  return {
    make: of(tx?.makes),
    model: of(tx?.models),
    city: of(tx?.cities),
    part: of(tx?.partCategories),
  }
}

// Most searched makes against the vehicle listings live now (owner, step 11.7-r13: searches per listing).
export function MakesTable(props: {
  rows?: SearchMakeRow[]
  average?: number | null
  loading?: boolean
}) {
  const { t, locale } = useT()
  const names = useNames()
  const num = (n: number) => formatNumber(n, locale)
  const { rows, average } = props
  return (
    <Section
      title={t("reports.search_makes")}
      note={t("reports.search_makes_note", {
        value: average == null ? "—" : num(average),
      })}
      loading={props.loading || !rows}
      empty={rows?.length === 0}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.search_col_make")}</TableHead>
            <TableHead className="text-end">
              {t("reports.search_col_searches")}
            </TableHead>
            <TableHead className="text-end">
              {t("reports.search_col_misses")}
            </TableHead>
            <TableHead className="text-end">
              {t("reports.search_col_live")}
            </TableHead>
            <TableHead className="text-end">
              {t("reports.search_col_per_listing")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows?.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <bdi className="text-ui">{names.make(r.id)}</bdi>
              </TableCell>
              <TableCell className="text-end num">{num(r.searches)}</TableCell>
              <TableCell className="text-end num">{num(r.misses)}</TableCell>
              <TableCell className="text-end num">{num(r.live)}</TableCell>
              <TableCell className="text-end num">
                {r.perListing === null
                  ? t("reports.search_no_listings")
                  : num(r.perListing)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  )
}

// Filter sets that found nothing, most misses first (owner: grouped by the whole set).
export function MissedTable(props: {
  rows?: SearchMissRow[]
  loading?: boolean
}) {
  const { t, locale } = useT()
  const names = useNames()
  const num = (n: number) => formatNumber(n, locale)
  const label = (r: SearchMissRow) =>
    [
      r.kind === "part"
        ? t("reports.search_kind_part")
        : r.type
          ? t(`post.type_${r.type}`)
          : t("reports.search_kind_vehicle"),
      r.make && names.make(r.make),
      r.model && names.model(r.model),
      r.partCategory && names.part(r.partCategory),
      r.city && names.city(r.city),
      r.intent && t(`common.for_${r.intent}`),
    ]
      .filter(Boolean)
      .join(" · ")
  return (
    <Section
      title={t("reports.search_missed")}
      note={t("reports.search_missed_note")}
      loading={props.loading || !props.rows}
      empty={props.rows?.length === 0}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reports.search_col_filters")}</TableHead>
            <TableHead className="text-end">
              {t("reports.search_col_searches")}
            </TableHead>
            <TableHead className="text-end">
              {t("reports.search_col_misses")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.rows?.map((r) => (
            <TableRow key={label(r) + String(r.hasText)}>
              <TableCell className="whitespace-normal">
                <span className="flex flex-wrap items-center gap-2">
                  <bdi className="text-ui">{label(r)}</bdi>
                  {r.hasText && (
                    <Badge variant="muted">{t("reports.search_typed")}</Badge>
                  )}
                </span>
              </TableCell>
              <TableCell className="text-end num">{num(r.searches)}</TableCell>
              <TableCell className="text-end num">{num(r.misses)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  )
}
